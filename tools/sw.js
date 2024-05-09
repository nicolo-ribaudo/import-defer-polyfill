import * as moduleRecorder from "./module-recorder/interceptor.js";
import * as importDeferPolyfill from "./import-defer-polyfill/interceptor.js";
import * as babel from "./deps/babel.js";

const interceptors = [moduleRecorder, importDeferPolyfill];

addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});

addEventListener("fetch", function (event) {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.destination !== "script") return;
  if (request.mode === "no-cors") return; // classic script

  const promise = instrumentedFetch(() => null, request);
  if (promise) event.respondWith(promise);
});

function instrumentedFetch(fallback, request) {
  const relevantInterceptors = interceptors.filter((i) =>
    i.matches(request.url)
  );
  if (relevantInterceptors.length === 0) return fallback(request);

  return fetchWithInterceptors(request, relevantInterceptors);
}

async function fetchWithInterceptors(request, relevantInterceptors) {
  const cleanURL = decodeURIComponent(
    relevantInterceptors.reduce((url, i) => i.transformURL(url), request.url)
  );

  const response = await fetch(new Request(cleanURL, request));
  if (!response.ok) return response;

  let code = await response.text();

  let ast = parse(code, cleanURL);
  const sources = { [cleanURL]: code };
  const ignoreSources = new Set([]);

  for (const interceptor of relevantInterceptors) {
    const { ast: newAst, internalSources } = await interceptor.transform(
      ast,
      cleanURL,
      request.url,
      instrumentedFetch.bind(fetch)
    );
    ast = newAst ?? ast;
    if (internalSources) {
      Object.assign(sources, internalSources);
      Object.keys(internalSources).forEach(ignoreSources.add, ignoreSources);
    }
  }

  code = print(ast, sources, (map) => {
    map.ignoreList.push(
      ...map.sources.flatMap((s, i) => (ignoreSources.has(s) ? [i] : []))
    );
  });

  return new Response(code, {
    headers: {
      "Content-Type": "application/javascript",
    },
  });
}

function parse(code, sourceFilename) {
  try {
    return babel.parse(code, {
      sourceType: "module",
      plugins: ["deferredImportEvaluation"],
      sourceFilename,
    });
  } catch (e) {
    console.log(code);
    e.message += ` in ${sourceFilename}`;
    throw e;
  }
}

function print(ast, sources, transformSourceMap) {
  let { code, map } = babel.generate(ast, { sourceMaps: true }, sources);
  transformSourceMap(map);
  code +=
    "\n//# sourceMappingURL=data:application/json;base64," +
    btoa(JSON.stringify(map));
  return code;
}
