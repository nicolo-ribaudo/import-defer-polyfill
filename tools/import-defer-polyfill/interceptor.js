import { types as t, template } from "../deps/babel.js";
import { hasTLA } from "../utils/ast.js";
import {
  evaluateCallHelperFileName,
  evaluateCallHelper,
  evaluateCallHelperCode,
  proxyHelperFileName,
  proxyHelper,
  proxyHelperCode,
} from "./runtime-helpers.js";

export function matches(url) {
  return !new URL(url).searchParams.has("no-defer-polyfill");
}

export function transformURL(url) {
  const urlObj = new URL(url);
  urlObj.searchParams.delete("deferred");
  return urlObj.href;
}

export function transform(ast, url, originalURL) {
  if (new URL(originalURL).searchParams.has("deferred")) {
    const newAst = hasTLA(ast)
      ? appendEmptyEvaluate(ast)
      : getDeferredModule(ast);

    return {
      ast: newAst,
      internalSources: { [proxyHelperFileName]: proxyHelperCode },
    };
  } else {
    return {
      ast: getWrapper(ast, url),
      internalSources: { [evaluateCallHelperFileName]: evaluateCallHelperCode },
    };
  }
}

/** @param {ReturnType<typeof parse>} ast  */
function getWrapper(ast, url) {
  const newBody = [];
  let hasDefault = false;

  for (const node of ast.program.body) {
    if (
      node.type === "ImportDeclaration" ||
      (node.type === "ExportNamedDeclaration" && node.source)
    ) {
      const source = t.stringLiteral(
        node.phase === "defer"
          ? ensureDeferred(node.source.value)
          : node.source.value
      );
      newBody.push(t.importDeclaration([], source));
    }

    hasDefault ||=
      node.type === "ExportDefaultDeclaration" ||
      (node.type === "ExportNamedDeclaration" &&
        !!node.specifiers?.some((s) => s.exported.name === "default"));
  }

  const deferredURL = ensureDeferred(url);

  newBody.push(t.exportAllDeclaration(t.stringLiteral(deferredURL)));
  if (hasDefault) {
    newBody.push(
      t.exportNamedDeclaration(
        null,
        [t.exportSpecifier(t.identifier("default"), t.identifier("default"))],
        t.stringLiteral(deferredURL)
      )
    );
  }

  newBody.push(
    t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier("__$evaluate"),
          t.identifier("__$evaluate")
        ),
      ],
      t.stringLiteral(deferredURL)
    ),
    t.cloneNode(evaluateCallHelper)
  );

  return t.program(newBody);
}

/** @param {ReturnType<typeof import("../deps/babel.js").parse>} ast  */
function getDeferredModule(ast) {
  const imports = [];
  const eagerImports = new Map();
  const proxies = [];

  const eagerStatements = [];

  const vars = [];
  const assignments = [];
  const exports = [];

  const functionBody = [];
  const hoistedFunctionBody = [];

  for (const node of ast.program.body) {
    if (
      node.type === "ImportDeclaration" ||
      (node.type === "ExportNamedDeclaration" && node.source) ||
      (node.type === "ExportAllDeclaration" && node.source)
    ) {
      if (hasLeadingComment(node, "@only-eager")) continue;

      const clone = t.cloneNode(node, true, true);
      clone.source = t.stringLiteral(ensureDeferred(node.source.value));
      imports.push(clone);
      if (clone.phase === "defer") {
        const tmp = t.identifier(`__${clone.specifiers[0].local.name}`);
        proxies.push(
          t.variableDeclarator(
            clone.specifiers[0].local,
            t.callExpression(t.identifier("__$proxy"), [tmp])
          )
        );
        clone.specifiers[0].local = t.cloneNode(tmp);
      } else {
        eagerImports.set(clone.source.value, node);
      }
      clone.phase = null;
    } else if (node.type === "ExportDefaultDeclaration") {
      const id = t.identifier("__default");
      vars.push(id);
      exports.push(t.exportSpecifier(t.cloneNode(id), t.identifier("default")));

      if (t.isExpression(node.declaration) || !node.declaration.id) {
        functionBody.push(
          t.expressionStatement(
            t.assignmentExpression("=", t.cloneNode(id), node.declaration)
          )
        );
      } else {
        functionBody.push(node.declaration);
        assignments.push(
          t.assignmentExpression("=", t.cloneNode(id), node.declaration.id)
        );
      }
    } else if (node.type === "ExportNamedDeclaration" && node.declaration) {
      functionBody.push(node.declaration);

      const names = Object.keys(
        t.getBindingIdentifiers(node.declaration, false, true)
      );
      for (const name of names) {
        vars.push(t.identifier(`__${name}`));
        exports.push(
          t.exportSpecifier(t.identifier(`__${name}`), t.identifier(name))
        );
        assignments.push(
          t.assignmentExpression(
            "=",
            t.identifier(`__${name}`),
            t.identifier(name)
          )
        );
      }
    } else if (node.type === "ExportNamedDeclaration") {
      for (const { local, exported } of node.specifiers) {
        vars.push(t.identifier(`__${exported.name}`));
        exports.push(
          t.exportSpecifier(t.identifier(`__${exported.name}`), exported)
        );
        assignments.push(
          t.assignmentExpression("=", t.identifier(`__${exported.name}`), local)
        );
      }
    } else if (hasLeadingComment(node, "@no-defer")) {
      eagerStatements.push(node);
    } else if (hasLeadingComment(node, "@hoist")) {
      hoistedFunctionBody.push(node);
    } else {
      functionBody.push(node);
    }
  }

  functionBody.push(t.expressionStatement(t.sequenceExpression(assignments)));

  const functionBodyPrefix = [];
  let i = 0;
  for (const [specifier, originalNode] of eagerImports) {
    imports.push(
      t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier(`__$evaluate$${++i}`),
            t.identifier("__$evaluate")
          ),
        ],
        t.stringLiteral(specifier)
      )
    );
    functionBodyPrefix.push(
      t.inherits(
        t.callExpression(t.identifier(`__$evaluate$${i}`), []),
        originalNode
      )
    );
  }
  functionBody.unshift(
    t.expressionStatement(
      t.assignmentExpression(
        "=",
        t.identifier("__$evaluate"),
        t.arrowFunctionExpression([], t.blockStatement([]))
      )
    ),
    ...hoistedFunctionBody,
    t.expressionStatement(t.sequenceExpression(functionBodyPrefix))
  );

  return t.program(
    [
      ...imports,
      proxies.length > 0 && t.cloneNode(proxyHelper),
      proxies.length > 0 && t.variableDeclaration("var", proxies),
      vars.length > 0 &&
        t.variableDeclaration(
          "var",
          vars.map((v) => t.variableDeclarator(v))
        ),
      exports.length > 0 && t.exportNamedDeclaration(null, exports),
      ...eagerStatements,
      t.exportNamedDeclaration(
        t.functionDeclaration(
          t.identifier("__$evaluate"),
          [],
          t.blockStatement(functionBody)
        ),
        []
      ),
      template.statement.ast`
        Object.defineProperty(__$evaluate, "name", { value: "(module top-level)", configurable: true })
      `,
    ].filter(Boolean)
  );
}

/** @param {ReturnType<typeof import("../deps/babel.js").parse>} ast  */
function appendEmptyEvaluate(ast) {
  return t.program([
    ...ast.program.body,
    t.exportNamedDeclaration(
      t.functionDeclaration(
        t.identifier("__$evaluate"),
        [],
        t.blockStatement([])
      ),
      []
    ),
  ]);
}

function ensureDeferred(url) {
  const questionMarkIndex = url.indexOf("?");
  if (questionMarkIndex === -1) {
    return `${url}?deferred`;
  }
  const hasDeferred = url.includes("deferred", questionMarkIndex);
  if (!hasDeferred) {
    return `${url}&deferred`;
  }
  return url;
}

function hasLeadingComment(node, value) {
  return node.leadingComments?.some((c) => c.value.includes(value));
}
