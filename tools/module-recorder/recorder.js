const graph = new Map();
const timeStart = new Map();
const timeRunning = new Map();
const asyncModules = new Set();

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
    before?.(times.at(-1));
    times.push(performance.now());
    return result;
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
  startSelf: multiTimeTracker(timeRunning),
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

  const node = {
    specifier,
    url,
    timeStart: timeStart.get(url),
    timeStartSelf: timeRunning.get(url)?.at(0),
    timeEnd: timeRunning.get(url)?.at(-1),
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
