const graph = new Map();
const timeStart = new Map();
const timeStartSelf = new Map();
const timeEnd = new Map();
const asyncModules = new Set();

const timeTracker = (map, before) => (url) => {
  url = decodeURIComponent(url);
  if (map.has(url)) return;
  before?.(url);
  map.set(url, performance.now());
};

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
  start: timeTracker(timeStart),
  startSelf: timeTracker(timeStartSelf),
  end: timeTracker(timeEnd, (url) => {
    const start = timeStart.get(url);
    while (performance.now() - start < 0.2);
  }),
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
    timeStartSelf: timeStartSelf.get(url),
    timeEnd: timeEnd.get(url),
    hasTLA: asyncModules.has(url),
    dependencies: [],
  };
  cache.set(url, node);

  for (const { specifier, resolved } of graph.get(url) ?? []) {
    node.dependencies.push(buildTree(resolved, specifier, cache));
  }

  path.delete(url);

  return node;
}
