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

async function loadDocument(relPath) {
  const html = readFile(relPath);
  const { JSDOM } = await getJsdomModule();
  const { window } = new JSDOM(html);
  return window.document;
}

module.exports = {
  readFile,
  loadDocument,
};
