import one from "./naturals/one.js";
import two from "./naturals/two.js";

let low = one;
let high = two;

for (let i = 0n; i < 250n; i++) {
  const next = low.add(high).divide(two);
  if (next.multiply(next).compareTo(two) > 0) {
    high = next;
  } else {
    low = next;
  }
}

export default low.add(high).divide(two);
