// Due to math, these utilities can only be prepared asynchronously!
await null;

export function double(dec) {
  return dec.add(dec);
}
