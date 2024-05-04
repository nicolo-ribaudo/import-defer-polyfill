import { parse, print } from "../utils/babel.js";
import { template, types as t } from "../deps/babel.js";

export function matches(url) {
  return url !== new URL("./recorder.js", import.meta.url).href;
}

export function transformURL(url) {
  return url;
}

export function transform(code, url) {
  const ast = parse(code, url);

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
    template.statement({ sourceType: "module", preserveComments: true }).ast`
      /*@no-defer*/ globalThis.__moduleGraphRecorder?.dependencies(
        ${t.stringLiteral(url)},
        ${t.valueToNode([...depedencies])},
        import.meta.resolve
      );
    `,
    template.statement.ast`
      globalThis.__moduleGraphRecorder?.start(${t.stringLiteral(url)})
    `,
    ...ast.program.body,
    template.statement.ast`
      globalThis.__moduleGraphRecorder?.end(${t.stringLiteral(url)})
    `,
  ];

  return print(ast, { [url]: code }, false);
}
