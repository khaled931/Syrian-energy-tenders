const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Compile the actual source in memory. Test doubles replace cloud boundaries;
// no Firebase credentials, network connection, or extra test runner is needed.
function loadTs(relativePath, mocks = {}) {
  const root = path.resolve(__dirname, "../..");
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = new Module(filename);
    loadedModule.filename = filename;
    loadedModule.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, loadedModule);
    if (filename.endsWith(".json")) {
      loadedModule.exports = JSON.parse(fs.readFileSync(filename, "utf8"));
      return loadedModule.exports;
    }
    const normalRequire = loadedModule.require.bind(loadedModule);
    loadedModule.require = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith("./") || name.startsWith("../") || name.startsWith("@/")) {
        const resolved = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
        for (const candidate of [resolved, `${resolved}.ts`, `${resolved}.tsx`]) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return load(candidate);
        }
      }
      return normalRequire(name);
    };
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    });
    loadedModule._compile(compiled.outputText, filename);
    return loadedModule.exports;
  }
  return load(path.join(root, relativePath));
}

module.exports = { loadTs };
