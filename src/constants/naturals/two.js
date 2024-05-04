import one from "./one.js";

// Due to math, 2 can only be computed asynchronously!
await null;

export default one.add(one);
