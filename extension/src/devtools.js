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

    const visualizer = new ModuleTreeVisualizer({
      minWidth: window.document.body.getBoundingClientRect().width,
      cellHeight: 20,
      svg: window.document.querySelector("#chart"),
      tooltip: window.document.querySelector("#tooltip"),
      tree,
    });
    visualizer.render();

    const on = (id, callback) => {
      window.document.getElementById(id).addEventListener("click", callback);
    };
    on("zoom-in", () => {
      visualizer.increaseScale().render();
    });
    on("zoom-out", () => {
      visualizer.decreaseScale().render();
    });
    on("refresh", async () => {
      const trees = await evalInPage("__moduleGraphRecorder.getTrees()");
      visualizer.setTree(trees[0]);
      visualizer.render();
    });
  });
});
