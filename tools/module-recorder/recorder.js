import { hasTLA } from "../utils/ast.js";

const graph = new Map();
const timeStart = new Map();
const timeEnd = new Map();
const asyncModules = new Set();

globalThis.__moduleGraphRecorder = {
  register(url, dependencies, resolve, hasTLA) {
    url = decodeURIComponent(url);
    if (graph.has(url)) return;
    graph.set(
      url,
      dependencies.map((specifier) => ({
        specifier,
        resolved: resolve(specifier),
      }))
    );
    if (hasTLA) asyncModules.add(url);
  },
  start(url) {
    url = decodeURIComponent(url);
    if (timeStart.has(url)) return;
    console.time(url);
    timeStart.set(url, performance.now());
  },
  end(url) {
    url = decodeURIComponent(url);
    if (timeEnd.has(url)) return;
    console.timeEnd(url);
    timeEnd.set(url, performance.now());
  },
  getTrees() {
    const entrypoints = new Set(graph.keys());
    for (const deps of graph.values()) {
      for (const { resolved: dep } of deps) entrypoints.delete(dep);
    }

    return Array.from(entrypoints, (url) => buildTree(url));
  },
  __graph: graph,
};

function buildTree(
  url,
  specifier = "<root>",
  cache = new Map(),
  path = new Set()
) {
  if (path.has(url)) return { specifier, url, circular: true };
  if (cache.has(url)) return cache.get(url);

  path.add(url);

  const node = {
    specifier,
    url,
    timeStart: timeStart.get(url),
    timeEnd: timeEnd.get(url),
    hasTLA: asyncModules.has(url),
    //durationSelf: round100(getDuration(url)), // I wish I had decimal
    //durationTotal: round100(getTotalDuration(url)),
    dependencies: [],
  };
  cache.set(url, node);

  for (const { specifier, resolved } of graph.get(url) ?? []) {
    node.dependencies.push(buildTree(resolved, specifier, cache));
  }

  path.delete(url);

  return node;
}

function getDuration(url) {
  const start = timeStart.get(url);
  const end = timeEnd.get(url);
  return end ? end - start : NaN;
}

function getTotalDuration(url) {
  let total = 0;

  const seen = new Set();
  const queue = [url];
  while (queue.length > 0) {
    const next = queue.shift();
    if (seen.has(next)) continue;
    seen.add(next);
    total += timeStart.has(next) ? getDuration(next) : 0;
    if (Number.isNaN(total)) return NaN;
    for (const dep of graph.get(next) ?? []) queue.push(dep.resolved);
  }

  return total;
}

function round100(value) {
  return Math.round(value * 100) / 100;
}
