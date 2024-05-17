import * as d3 from "https://esm.sh/d3@7.9.0";

export class ModuleTreeVisualizer {
  #minWidth = 0;
  #cellHeight = 0;
  #scale = 1;

  #svg = null;
  #tooltip = null;

  #data = null;

  #minTime = 0;
  #maxTime = 0;
  #maxDepth = 0;

  constructor({
    minWidth = 960,
    cellHeight = 18,
    svg,
    tooltip,
    tree,
    scale = 1,
  }) {
    this.#cellHeight = cellHeight;
    this.#svg = svg;
    this.#tooltip = tooltip;
    this.#minWidth = minWidth;
    this.#scale = scale;

    this.setTree(tree);
  }

  get scale() {
    return this.#scale;
  }

  increaseScale() {
    this.#scale *= 1.25;
    return this;
  }

  decreaseScale() {
    this.#scale *= 0.8;
    return this;
  }

  setTree(tree) {
    this.#data = this.#normalizeData(tree);
    this.#minTime = Math.min(...this.#data.map((d) => d.timeStart ?? Infinity));
    this.#maxTime = Math.max(
      ...this.#data.map(
        (d) => (d.timeStartSelf ?? 0) + d.durationSelf ?? -Infinity
      )
    );
    this.#maxDepth = Math.max(...this.#data.map((d) => d.depth));
    return this;
  }

  get #duration() {
    return this.#maxTime - this.#minTime;
  }

  get #width() {
    return Math.max(this.#minWidth, this.#duration) * this.#scale;
  }

  get #xScale() {
    return this.#width / this.#duration;
  }

  render() {
    const tooltip = d3
      .select(this.#tooltip)
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.7)")
      .style("color", "white")
      .style("opacity", 0)
      .style("pointer-events", "none");

    const svg = d3
      .select(this.#svg)
      .style("display", "block")
      .style("width", `${this.#width}px`)
      .attr(
        "viewBox",
        `0 0 ${this.#width} ${(this.#maxDepth + 1) * (this.#cellHeight + 2)}`
      )
      .attr("preserveAspectRatio", "none");

    svg.selectAll("*").remove();

    const s = (n) => n * this.#xScale;
    const o = (n) => s(n - this.#minTime);
    const data = this.#data.map((d) => {
      let depsStart = 0;
      let depsWidth = 0;
      let selfStart = 0;
      let selfWidth = 0;

      if (d.durationSelf === 0) {
        depsStart = o(d.timeStart) + 1;
        depsWidth = Math.max(0, s(d.durationDeps) - 2);
      } else if (d.durationDeps === 0) {
        selfStart = o(d.timeStart) + 1;
        selfWidth = Math.max(0, s(d.durationSelf) - 2);
      } else {
        depsStart = o(d.timeStart) + 1;
        depsWidth = Math.max(0, s(d.durationDeps) - 1);
        selfStart = o(d.timeStart + d.durationDeps);
        selfWidth = Math.max(0, s(d.durationSelf) - 1);
      }

      const timeSelf = [];
      if (d.durationSelf > 0) {
        d.timeSelf.forEach(({ start, duration }, i) => {
          const startOffset = i === 0 && depsWidth > 0 ? 0 : 1;
          timeSelf.push({
            depth: d.depth,
            start: o(start) + startOffset,
            width: Math.max(0, s(duration) - 1 - startOffset),
          });
        });
      }

      return { ...d, depsStart, depsWidth, selfStart, selfWidth, timeSelf };
    });

    const groups = svg
      .selectAll("g")
      .data(data)
      .join("g")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        /** @type {HTMLElement} */
        const target = event.target;
        const rect = target.getBoundingClientRect();
        tooltip
          .style("left", event.pageX + "px")
          .style("top", rect.bottom + "px")
          .style("opacity", 1);

        let html = `
          <strong>${d.url}</strong>
          <br><em>Duration (total):</em>
              ${round(d.durationDeps + d.durationSelf)}ms
              (start: ${round(d.timeStart)}ms,
              end: ${round(d.timeStart + d.durationDeps + d.durationSelf)}ms)
          <br><em>Duration (self):</em> ${round(d.durationSelf)}ms
            (start: ${round(d.timeStartSelf)}ms,
            end: ${round(d.timeStartSelf + d.durationSelf)}ms)
        `;
        if (d.hasTLA) {
          html += `<br><em>Has TLA</em>`;
        }
        if (d.stack.length > 0) {
          html += `
            <br><em>Stack:</em>
            <ul>
          `;
          for (const url of d.stack.toReversed()) {
            html += `<li>${url}</li>`;
          }
          html += `</ul>`;
        }
        if (d.dependencies.length > 0) {
          html += `
            <br><em>Dependencies:</em>
            <ul>
          `;

          for (const {
            url,
            deferred,
            alreadyEvaluated,
            timeStart,
          } of d.dependencies) {
            html += `<li>
              ${deferred ? "(defer)" : ""}
              ${alreadyEvaluated ? `(already evaluated at ${timeStart}ms)` : ""}
              ${url}
            </li>`;
          }
          html += `</ul>`;
        }
        tooltip.html(html);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    const lineHeight = this.#cellHeight + 2;

    groups
      .append("rect")
      .attr("x", (d) => d.depsStart)
      .attr("y", (d) => d.depth * lineHeight)
      .attr("width", (d) => d.depsWidth)
      .attr("height", this.#cellHeight)
      .attr("fill", "rgb(255, 164, 13, 50%)");

    groups
      .append("line")
      .style("stroke", "rgb(255, 164, 13, 100%)")
      .style("stroke-width", 2)
      .attr("x1", (d) => d.selfStart)
      .attr("x2", (d) => d.selfStart + d.selfWidth)
      .attr("y1", (d) => d.depth * lineHeight + this.#cellHeight / 2)
      .attr("y2", (d) => d.depth * lineHeight + this.#cellHeight / 2);

    groups
      .append("g")
      .selectAll("rect")
      .data((d) => d.timeSelf)
      .join("rect")
      .attr("x", (d) => d.start)
      .attr("y", (d) => d.depth * lineHeight)
      .attr("width", (d) => d.width)
      .attr("height", this.#cellHeight)
      .attr("fill", "rgba(255, 164, 13, 100%)");

    groups
      .append("text")
      .style("fill", "black")
      .style("font-weight", "bold")
      .text((d) => d.url)
      .attr("x", (d) => (d.depsStart || d.selfStart) + 2)
      .attr("y", (d) => d.depth * lineHeight + this.#cellHeight - 4)
      .each(function (d) {
        wrap(d3.select(this), d.depsWidth + d.timeSelf[0].width, 2);
      });
  }

  #normalizeData(tree) {
    const path = new Set();
    const nodes = [];
    const used = new Set();

    console.log(tree);

    const recurse = (node, depth, onlyAsync) => {
      if (path.has(node.url)) return;
      path.add(node.url);

      if (node.timeStartSelf !== undefined && (!onlyAsync || node.hasTLA)) {
        if (!used.has(node.url)) {
          used.add(node.url);
          nodes.push({
            url: node.url,
            depth,
            timeStart: round(node.timeStart, 3),
            timeStartSelf: round(node.timeStartSelf, 3),
            durationDeps: round(node.timeStartSelf - node.timeStart, 3),
            durationSelf: round(node.timeEnd - node.timeStartSelf, 3),
            timeSelf: node.timeSelf.map(([start, end]) => ({
              start: round(start, 3),
              duration: round(end - start, 3),
            })),
            hasTLA: node.hasTLA,
            stack: Array.from(path),
            dependencies: node.dependencies.map(
              ({ module: child, deferred }) => ({
                url: child.url,
                deferred,
                alreadyEvaluated: child.timeStart < node.timeStart,
                timeStart: round(child.timeStart, 3),
              })
            ),
          });
        }
      }

      node.dependencies.forEach(({ module: child }) => {
        recurse(
          child,
          depth + 1,
          onlyAsync || node.timeStartSelf === undefined
        );
      });
      path.delete(node.url);
    };
    recurse(tree, 0);
    return nodes;
  }
}

function round(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return undefined;
  return Math.round(n * 10 ** digits) / 10 ** digits;
}

function wrap(self, width, padding) {
  let textLength = self.node().getComputedTextLength(),
    text = self.text();
  const tooLong = () => textLength > width - 2 * padding;
  while (tooLong() && text.length > 0) {
    text = text.slice(1);
    self.text("…" + text);
    textLength = self.node().getComputedTextLength();
  }
  if (tooLong()) self.remove();
}
