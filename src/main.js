import { html, render, signal } from "./deps/preact.js";

import defer * as pi from "./constants/pi.js";
import defer * as e from "./constants/e.js";
import defer * as ln2 from "./constants/ln2.js";
import defer * as sqrt2 from "./constants/sqrt2.js";

import {Output} from "./Output.js";

const showPI = signal(false);
const showE = signal(false);
const showLN2 = signal(false);
const showSQRT2 = signal(false);

function App() {
  return html`
    <div>
      <button onClick=${() => showPI.value = !showPI.value}>Toggle PI</button>
      ${showPI.value ? html`<${Output} actual=${pi.default} expected="${Math.PI}" />` : null}
    </div>
    <div>
      <button onClick=${() => showE.value = !showE.value}>Toggle E</button>
      ${showE.value ? html`<${Output} actual=${e.default} expected="${Math.E}" />` : null}
    </div>
    <div>
      <button onClick=${() => showLN2.value = !showLN2.value}>Toggle ln2</button>
      ${showLN2.value ? html`<${Output} actual=${ln2.default} expected="${Math.LN2}" />` : null}
    </div>
    <div>
      <button onClick=${() => showSQRT2.value = !showSQRT2.value}>Toggle sqrt2</button>
      ${showSQRT2.value ? html`<${Output} actual=${sqrt2.default} expected="${Math.SQRT2}" />` : null}
    </div>
  `;
}

render(html`<${App} />`, document.querySelector("#app"));
