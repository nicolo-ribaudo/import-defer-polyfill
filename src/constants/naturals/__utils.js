// Due to math, these utilities can only be prepared asynchronously!
await new Promise((resolve) => setTimeout(resolve, 5));

export function double(dec) {
  return dec.add(dec);
}
