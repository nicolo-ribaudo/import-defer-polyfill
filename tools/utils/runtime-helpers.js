import { parse } from "../deps/babel.js";

export function defineHelper(code, filename) {
  const helper = parse(code, {
    sourceType: "module",
    sourceFilename: filename,
  }).program.body[0];
  helper.__compact = true;
  return { helper, filename, code };
}
