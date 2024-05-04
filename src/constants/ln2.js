import { BigDecimal } from "../deps/bigdecimal.js";

import one from "./naturals/one.js";
import two from "./naturals/two.js";

// ln2 = 1/1 - 1/2 + 1/3 - 1/4 + 1/5 - 1/6 + ...
//     = (1 - 1/2) + (1/3 - 1/4) + (1/5 - 1/6) + ...
//     = sum_i=0 1/(2i+1) - 1/(2i+2)
//     = sum_i=0 (2i+2-2i-1)/(2i+1)(2i+2)
//     = sum_i=0 1/(4i^2+6i+2)
//     = sum_i=0 0.5/(2i^2+3i+1)
//     = 0.5 sum_i=0 1/(i(2i+3)+1)

let doubleLN2 = new BigDecimal("0");
for (let i = 0n; i < 5_000n; i++) {
  doubleLN2 = doubleLN2.add(
    one.divide(new BigDecimal(String(i * (2n * i + 3n) + 1n)), 100, 6)
  );
}

export default doubleLN2.divide(two);
