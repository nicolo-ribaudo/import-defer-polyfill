# Import defer polyfill & devtool

- `index.html` and `./src` contain a demo app
- `./tools` contains the service worker that implements `import defer` support and tracks module execution
- `./extension` contains a Chrome extension that implements the new _Modules_ devtools panel