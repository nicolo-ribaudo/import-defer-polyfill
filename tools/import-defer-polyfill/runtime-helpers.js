import { parse } from "../utils/babel.js";

export const {
  helper: proxyHelper,
  filename: proxyHelperFileName,
  code: proxyHelperCode,
} = defineHelper(
  `
    function __$proxy(ns) {
      return new Proxy(ns, {
        get(target, prop, receiver) {
          if (typeof prop === "string") target.__$evaluate();
          return Reflect.get(target, prop, receiver);
        }
      });
    }
  `,
  "import-defer-polyfill://import-defer-polyfill/namespace-proxy"
);

export const {
  helper: evaluateCallHelper,
  filename: evaluateCallHelperFileName,
  code: evaluateCallHelperCode,
} = defineHelper(
  `__$evaluate();`,
  "import-defer-polyfill://import-defer-polyfill/evaluate-call"
);

function defineHelper(code, filename) {
  const helper = parse(code, filename).program.body[0];
  helper.__compact = true;
  return { helper, filename, code };
}
