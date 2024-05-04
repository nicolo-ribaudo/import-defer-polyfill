import { BigDecimal } from "../deps/bigdecimal.js";

import two from "./naturals/two.js";

// https://en.wikipedia.org/wiki/Leibniz_formula_for_%CF%80
let pi_4 = new BigDecimal("0");
for (let i = 0n; i < 5_000n; i++) {
  pi_4 = pi_4.add(
    two.divide(new BigDecimal(String(16n * i * (i + 1n) + 3n)), 100, 6)
  );
}

export default pi_4.multiply(new BigDecimal("4"));
