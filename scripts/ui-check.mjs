#!/usr/bin/env node
/*
 UI Check (viewport-aware)
 - Serves ./public on a local port
 - Captures screenshots at desktop/tablet/mobile
 - Measures gaps between Topic, Difficulty, Length, and the Actions stack
 - Fails with non-zero code when alignment drifts beyond tolerance

 Requires: puppeteer (dev dep). If missing, prints instructions and exits 0.
*/

import http from 'node:http';
import { readFileSync, statSync, createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { extname, resolve, join, dirname } from 'node:path';

const root = resolve(process.cwd(), 'public');
const artifactsDir = resolve(process.cwd(), '.artifacts', 'ui');

function servePublic(port = 3999) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${port}`);
      let filePath = decodeURIComponent(url.pathname);
      if (filePath === '/') filePath = '/index.html';
      const abs = resolve(root, '.' + filePath);
      if (!abs.startsWith(root)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const ext = extname(abs).toLowerCase();
      const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json' };
      const type = types[ext] || 'application/octet-stream';
      statSync(abs); // throws if missing
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      createReadStream(abs).pipe(res);
    } catch (err) {
      res.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolveP) => {
    server.listen(port, () => resolveP(server));
  });
}

async function tryImportPuppeteer() {
  try {
    const mod = await import('puppeteer');
    return mod.default || mod;
  } catch (err) {
    console.log('[ui-check] puppeteer not installed. Run: npm i -D puppeteer');
    return null;
  }
}

function ensureDir(dir) {
  try { mkdirSync(dir, { recursive: true }); } catch {}
}

async function run() {
  const puppeteer = await tryImportPuppeteer();
  if (!puppeteer) return; // graceful no-op when dep missing

  const server = await servePublic(3999);
  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: null });
  const page = await browser.newPage();

  ensureDir(artifactsDir);

  const viewports = [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  const failures = [];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3999/index.html?visual=soft', { waitUntil: 'networkidle0' });
    // give modules a tick
    await page.waitForTimeout(150);

    const metrics = await page.evaluate(() => {
      const tb = document.querySelector('.gen-toolbar');
      const topic = document.querySelector('.gen-toolbar > .toolbar-field:first-of-type');
      const diff = document.querySelector('.gen-toolbar .toolbar-field--difficulty');
      const len = document.querySelector('.gen-toolbar .number-field');
      const actions = document.querySelector('.gen-toolbar .action-stack');
      if (!tb || !topic || !diff || !len || !actions) return null;
      const r = (el) => el.getBoundingClientRect();
      const tr = r(tb), r1 = r(topic), r2 = r(diff), r3 = r(len), ra = r(actions);
      const g12 = Math.round(r2.left - r1.right);
      const g23 = Math.round(r3.left - r2.right);
      const g3A = Math.round(ra.left - r3.right);
      const inside = ra.right <= tr.right + 0.5 && ra.left >= tr.left - 0.5;
      return { g12, g23, g3A, inside, tr, r1, r2, r3, ra };
    });

    if (!metrics) {
      failures.push({ viewport: vp.name, reason: 'missing-toolbar-elements' });
    } else {
      const tol = 2; // px
      const okEqual = Math.abs(metrics.g12 - metrics.g23) <= tol;
      const okLast = Math.abs(metrics.g23 - metrics.g3A) <= tol; // last gap similar to others
      if (!okEqual || !okLast) {
        failures.push({ viewport: vp.name, reason: 'uneven-gaps', metrics });
      }
      if (!metrics.inside) failures.push({ viewport: vp.name, reason: 'actions-overflow', metrics });
    }

    const snap = await page.screenshot({ fullPage: false });
    writeFileSync(join(artifactsDir, `toolbar-${vp.name}.png`), snap);
  }

  await browser.close();
  server.close();

  if (failures.length) {
    console.error('[ui-check] Failures:', JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else {
    console.log('[ui-check] All viewports look good. Artifacts in ./.artifacts/ui');
  }
}

run().catch((err) => { console.error(err); process.exitCode = 1; });

