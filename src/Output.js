import { html } from "./deps/preact.js";

export function Output({ actual, expected }) {
  const actualString = actual.toString().slice(0, 30);
  const expectedString = expected.toFixed(20);

  const actualParts = [];
  for (const [i, char] of expectedString.split("").entries()) {
    actualParts.push(
      html`
        <span style="color: ${char === actualString[i] ? "green" : "red"}">
          ${actualString[i]}
        </span>
      `
    );
  }

  return html` <pre>${actualParts}${actualString.slice(
    expectedString.length
  )} (actual)
    <br/>
    ${expectedString} (expected)
  </pre>`;
}
