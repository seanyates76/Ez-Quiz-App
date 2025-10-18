'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.resolve(__dirname, '..');

function resolve(relPath) {
  return path.resolve(ROOT_DIR, relPath);
}

function readFile(relPath) {
  return fs.readFileSync(resolve(relPath), 'utf8');
}

function loadDocument(relPath) {
  const html = readFile(relPath);
  const { window } = new JSDOM(html);
  return window.document;
}

module.exports = {
  readFile,
  loadDocument,
};
