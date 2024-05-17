const graph = new Map();
const timeStart = new Map();
const timeRunning = new Map();
const asyncModules = new Set();
const stacks = new Map();

const timeTracker = (map, before) => (url) => {
  url = decodeURIComponent(url);
  if (map.has(url)) return;
  before?.(url);
  map.set(url, performance.now());
};

const multiTimeTracker =
  (map, before) =>
  (result, url = result) => {
    url = decodeURIComponent(url);
    let times = map.get(url);
    if (!times) map.set(url, (times = []));
    before?.(times.at(-1), url);
    times.push(performance.now());
    return result;
  };

globalThis.__moduleGraphRecorder = {
  register(url, dependencies, resolve, hasTLA, deferredImportsIndexes) {
    url = decodeURIComponent(url);
    if (graph.has(url)) return;

    const deferred = new Set(deferredImportsIndexes);
    graph.set(
      url,
      dependencies.map((specifier, i) => ({
        specifier,
        resolved: resolve(specifier),
        deferred: deferred.has(i),
      }))
    );
    if (hasTLA) asyncModules.add(url);
  },
  start: timeTracker(timeStart),
  startSelf: multiTimeTracker(timeRunning, (_prev, url) => {
    stacks.set(url, new Error());
  }),
  resume: multiTimeTracker(timeRunning),
  end: multiTimeTracker(timeRunning, (prev) => {
    while (performance.now() - prev < 0.2);
  }),
  pause: multiTimeTracker(timeRunning, (prev) => {
    while (performance.now() - prev < 0.2);
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

  const timeSelf = [];
  const recorded = timeRunning.get(url);
  if (recorded) {
    for (let i = 0; i < recorded.length; i += 2) {
      timeSelf.push([recorded[i], recorded[i + 1]]);
    }
  }

  const node = {
    specifier,
    url,
    timeStart: timeStart.get(url),
    timeStartSelf: timeRunning.get(url)?.at(0),
    timeEnd: timeRunning.get(url)?.at(-1),
    timeSelf,
    hasTLA: asyncModules.has(url),
    stack: stacks.get(url)?.stack.split("\n").slice(1).join("\n"),
    dependencies: [],
  };
  cache.set(url, node);

  for (const { specifier, resolved, deferred } of graph.get(url) ?? []) {
    node.dependencies.push({
      deferred,
      module: buildTree(resolved, specifier, cache),
    });
  }

  path.delete(url);

  return node;
}
