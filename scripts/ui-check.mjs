import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) fail(`${label}: missing ${needle}`);
}

function stripQuery(url) {
  return String(url || '').replace(/^\//, '').split('?')[0];
}

const index = read('public/index.html');
const sw = read('public/sw.js');

assertIncludes(index, 'v3.5.0', 'index release label');
assertIncludes(index, 'Create Quiz', 'index main flow');
assertIncludes(index, 'Start Quiz', 'index main flow');
assertIncludes(index, 'Results', 'index main flow');
assertIncludes(index, 'explanations', 'index main flow');
assertIncludes(index, 'Public quiz lengths are 5, 10, 15, and 20 questions.', 'help/release notes');
assertIncludes(index, 'Valid pasted manual lines are parsed in the browser', 'help/manual parse');
assertIncludes(index, 'Explain sends only the selected result item', 'help/explanation privacy');
assertIncludes(index, 'PDF, images, TXT, Markdown, HTML, CSV, JSON, RTF, and DOCX', 'help/import support');

assertIncludes(sw, "const ASSET_VERSION = '1.5.35';", 'service worker asset version');
assertIncludes(sw, "const CACHE_NAME = 'ezq-v1219';", 'service worker cache');

const referenced = [];
for (const match of index.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
  const raw = match[1];
  if (/^(?:https?:|mailto:|#)/i.test(raw)) continue;
  const rel = stripQuery(raw);
  if (!rel || rel === 'LICENSE.txt') continue;
  referenced.push(rel);
}

for (const rel of referenced) {
  const target = path.join(publicDir, rel);
  if (!fs.existsSync(target)) fail(`index reference missing: ${rel}`);
}

const duplicateIds = new Map();
for (const match of index.matchAll(/\bid="([^"]+)"/g)) {
  const id = match[1];
  duplicateIds.set(id, (duplicateIds.get(id) || 0) + 1);
}
for (const [id, count] of duplicateIds.entries()) {
  if (count > 1 && id !== 'versionInfoBtn') fail(`duplicate id: ${id}`);
}

if (failures.length) {
  console.error('ui-check failed:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('ui-check passed');
