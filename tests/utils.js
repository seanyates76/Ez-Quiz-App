'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
let jsdomModulePromise;

async function getJsdomModule() {
  if (!jsdomModulePromise) {
    const jsdomPath = require.resolve('jsdom');
    jsdomModulePromise = import(pathToFileURL(jsdomPath));
  }

  return jsdomModulePromise;
}

const ROOT_DIR = path.resolve(__dirname, '..');

function resolve(relPath) {
  return path.resolve(ROOT_DIR, relPath);
}

function readFile(relPath) {
  return fs.readFileSync(resolve(relPath), 'utf8');
}

function loadBrowserModule(relPath, namedExports) {
  if (!Array.isArray(namedExports) || namedExports.length === 0) {
    throw new Error('namedExports must be a non-empty array');
  }
  const absPath = resolve(relPath);
  const source = readFile(relPath)
    .replace(/export\s+class\s+/g, 'class ')
    .replace(/export\s+async\s+function\s+/g, 'async function ')
    .replace(/export\s+function\s+/g, 'function ');
  // Evaluate in the current context so browser globals like Blob remain available.
  const factory = new Function(`${source}\nreturn { ${namedExports.join(', ')} };\n//# sourceURL=${absPath}`);
  return factory();
}

async function loadDocument(relPath) {
  const html = readFile(relPath);
  const { JSDOM } = await getJsdomModule();
  const { window } = new JSDOM(html);
  return window.document;
}

module.exports = {
  readFile,
  loadBrowserModule,
  loadDocument,
};
