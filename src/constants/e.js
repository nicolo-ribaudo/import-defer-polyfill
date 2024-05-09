import { BigDecimal } from "../deps/bigdecimal.js";

import one from "./naturals/one.js";

// e = 1/0! + 1/1! + 1/2! + 1/3! + 1/4! + ...

let e = one;
let factorial = 1n;
for (let i = 1n; i < 300n; i++) {
  factorial *= i;
  e = e.add(one.divide(new BigDecimal(String(factorial)), 100, 6));
}

export default e;
