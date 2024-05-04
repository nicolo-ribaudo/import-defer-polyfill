import * as moduleRecorder from "./tools/module-recorder/interceptor.js";
import * as importDeferPolyfill from "./tools/import-defer-polyfill/interceptor.js";
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

  for (const interceptor of relevantInterceptors) {
    code = await interceptor.transform(
      code,
      cleanURL,
      request.url,
      instrumentedFetch.bind(fetch)
    );
  }

  return new Response(code, {
    headers: {
      "Content-Type": "application/javascript",
    },
  });
}
