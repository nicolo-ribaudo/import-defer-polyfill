// Hopefully this will be replaced by https://github.com/babel/babel/issues/16471
/** @param {ReturnType<typeof import("../deps/babel.js").parse>} ast  */
export function hasTLA(ast) {
  const queue = [ast.program];
  for (const node of queue) {
    for (const children of Object.values(node)) {
      for (const child of Array.isArray(children) ? children : [children]) {
        if (typeof child !== "object") break;
        if (!child) continue;
        if (typeof child.type !== "string") break;
        switch (child.type) {
          case "AwaitExpression":
            return true;
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
  return false;
}
