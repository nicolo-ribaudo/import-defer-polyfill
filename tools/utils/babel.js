import { parse as babelParse, generate } from "../deps/babel.js";

export function parse(code, sourceFilename) {
  try {
    return babelParse(code, {
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

export function print(ast, sources, transformSourceMap) {
  let { code, map } = generate(
    ast,
    {
      sourceMaps: transformSourceMap !== false,
    },
    sources
  );
  if (typeof transformSourceMap === "function") transformSourceMap(map);
  if (transformSourceMap !== false) {
    code +=
      "\n//# sourceMappingURL=data:application/json;base64," +
      btoa(JSON.stringify(map));
  }
  return code;
}
