import { template, types as t } from "../deps/babel.js";
import { hasTLA } from "../utils/ast.js";

const statement = template.statement({
  sourceType: "module",
  preserveComments: true,
});

export function matches(url) {
  return url !== new URL("./recorder.js", import.meta.url).href;
}

export function transformURL(url) {
  return url;
}

/** @param {ReturnType<typeof import("../deps/babel.js").parse>} ast  */
export function transform(ast, url) {
  const depedencies = new Set();
  for (const node of ast.program.body) {
    if (
      node.type === "ImportDeclaration" ||
      (node.type === "ExportNamedDeclaration" && node.source) ||
      (node.type === "ExportAllDeclaration" && node.source)
    ) {
      depedencies.add(node.source.value);
    }
  }

  ast.program.body = [
    depedencies.size > 0 &&
      t.addComment(
        t.importDeclaration(
          [],
          t.stringLiteral(
            `data:text/javascript,globalThis.__moduleGraphRecorder?.start(${JSON.stringify(
              url
            )})`
          )
        ),
        "leading",
        "@only-eager"
      ),
    statement.ast`
      /*@no-defer*/ globalThis.__moduleGraphRecorder?.register(
        ${t.stringLiteral(url)},
        ${t.valueToNode([...depedencies])},
        import.meta.resolve,
        ${t.booleanLiteral(hasTLA(ast))}
      );
    `,
    statement.ast`
      /*@hoist*/globalThis.__moduleGraphRecorder?.start(${t.stringLiteral(url)})
    `,
    statement.ast`
      globalThis.__moduleGraphRecorder?.startSelf(${t.stringLiteral(url)})
    `,
    ...ast.program.body,
    statement.ast`
      globalThis.__moduleGraphRecorder?.end(${t.stringLiteral(url)})
    `,
  ].filter(Boolean);

  return ast;
}
