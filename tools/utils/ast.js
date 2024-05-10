// Hopefully this will be replaced by https://github.com/babel/babel/issues/16471
/** @param {ReturnType<typeof import("../deps/babel.js").parse>} ast  */
export function hasTLA(ast) {
  return visitTLA(ast, () => ({ action: "return", value: true })) ?? false;
}

export function mapTLA(ast, callback) {
  visitTLA(ast, (node) => {
    const { replacement, next } = callback(node);
    return { action: "replace", value: replacement, next };
  });
}

/** @param {ReturnType<typeof import("../deps/babel.js").parse>} ast  */
function visitTLA(ast, callback) {
  const queue = [ast.program];
  for (const node of queue) {
    for (const [containerKey, children] of Object.entries(node)) {
      const isArray = Array.isArray(children);
      const container = isArray ? children : node;
      const it = isArray ? children.entries() : [[containerKey, children]];
      for (const [key, child] of it) {
        if (typeof child !== "object") break;
        if (!child) continue;
        if (typeof child.type !== "string") break;
        switch (child.type) {
          case "AwaitExpression": {
            const { action, value, next } = callback(child);
            if (action === "return") {
              return value;
            } else if (action === "replace") {
              container[key] = value;
              queue.push(next);
              break;
            } else {
              throw new Error(`Unsupported action ${action}`);
            }
          }
          case "FunctionDeclaration":
          case "FunctionExpression":
          case "ArrowFunctionExpression":
          case "StaticBlock":
            break;
          case "ObjectMethod":
          case "ClassMethod":
            if (child.computed) queue.push(child.key);
            if (child.decorators) queue.push(...child.decorators);
            break;
          default:
            queue.push(child);
        }
      }
    }
  }
}
