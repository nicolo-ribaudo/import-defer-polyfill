/** @typedef {import("npm:@types/chrome")} */

import { ModuleTreeVisualizer } from "./graph.js";

function evalInPage(code) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(code, (result, exceptionInfo) => {
      if (exceptionInfo) {
        reject(exceptionInfo);
      } else {
        resolve(result);
      }
    });
  });
}

chrome.devtools.panels.create("Modules", "", "panel.html", (panel) => {
  panel.onShown.addListener(async (window) => {
    if (!(await evalInPage("window.__moduleGraphRecorder"))) return;
    const trees = await evalInPage("__moduleGraphRecorder.getTrees()");
    const tree = trees[0];

    const $container = window.document.querySelector("#chart-container");
    const $chart = window.document.querySelector("#chart");
    const $tooltip = window.document.querySelector("#tooltip");

    const visualizer = new ModuleTreeVisualizer({
      minWidth: $container.getBoundingClientRect().width,
      cellHeight: 20,
      svg: $chart,
      tooltip: $tooltip,
      tree,
    });
    visualizer.render();

    const on = (id, callback) => {
      window.document.getElementById(id).addEventListener("click", callback);
    };
    on("zoom-in", () => {
      const oldScale = visualizer.scale;
      visualizer.increaseScale().render();
      $container.scrollLeft *= visualizer.scale / oldScale;
    });
    on("zoom-out", () => {
      const oldScale = visualizer.scale;
      visualizer.decreaseScale().render();
      $container.scrollLeft *= visualizer.scale / oldScale;
    });
    on("refresh", async () => {
      const trees = await evalInPage("__moduleGraphRecorder.getTrees()");
      visualizer.setTree(trees[0]);
      visualizer.render();
    });
  });
});
