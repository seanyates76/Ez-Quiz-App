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
import { extname, resolve, join } from 'node:path';

const root = resolve(process.cwd(), 'public');
const artifactsDir = resolve(process.cwd(), '.artifacts', 'ui');
const PORT = Number(process.env.UI_CHECK_PORT || 0); // 0 = ephemeral

function servePublic(port = PORT) {
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
  return new Promise((resolveP, rejectP) => {
    server.once('error', (err) => {
      try { server.close(); } catch {}
      rejectP(err);
    });
    server.listen(port, '127.0.0.1', () => resolveP(server));
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

  // Try to spin a tiny HTTP server; if sandbox blocks, we fall back to setContent mode
  let server = null;
  let resolvedPort = PORT || 0;
  try {
    server = await servePublic(PORT);
    const addr = server.address();
    resolvedPort = (addr && addr.port) || resolvedPort;
  } catch {}

  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: null });
  const page = await browser.newPage();

  ensureDir(artifactsDir);

  const viewports = [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  const failures = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    if (server) {
      await page.goto(`http://127.0.0.1:${resolvedPort}/index.html?visual=soft`, { waitUntil: 'domcontentloaded' });
      await sleep(250);
    } else {
      // Fallback: inline CSS + HTML without scripts to measure layout deterministically
      let html = readFileSync(join(root, 'index.html'), 'utf8');
      const css = readFileSync(join(root, 'styles.css'), 'utf8');
      html = html
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/<link[^>]+styles\.css[^>]*>/i, `<style>${css}</style>`)
        .replace(/<body(\s[^>]*)?>/i, (m) => m.includes('data-visual') ? m : m.replace('<body', '<body data-visual="soft"'));
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await sleep(150);
    }

    const metrics = await page.evaluate(() => {
      const out = { found: {}, selectors: {}, errors: [] };
      const q = (sel, ctx=document) => ctx.querySelector(sel);
      const tb = q('.gen-toolbar');
      if (!tb) { out.errors.push('Missing .gen-toolbar'); return out; }
      out.selectors.toolbar = '.gen-toolbar';

      // Support nested structure (.toolbar-left) or original flat structure
      const left = q('.toolbar-left', tb) || tb;
      out.selectors.left = left === tb ? '.gen-toolbar (flat)' : '.toolbar-left';

      const topic = q('.toolbar-field', left);
      const diff = q('.toolbar-field--difficulty', left);
      const len = q('.number-field', left);
      const actions = q('.action-stack', tb);

      out.found = {
        toolbar: !!tb, left: !!left, topic: !!topic, difficulty: !!diff, length: !!len, actions: !!actions,
      };
      out.selectors.topic = '.toolbar-field (first in left)';
      out.selectors.difficulty = '.toolbar-field--difficulty';
      out.selectors.length = '.number-field';
      out.selectors.actions = '.action-stack';

      if (!topic) out.errors.push('Missing Topic (.toolbar-field first within left)');
      if (!diff) out.errors.push('Missing Difficulty (.toolbar-field--difficulty)');
      if (!len) out.errors.push('Missing Length (.number-field)');
      if (!actions) out.errors.push('Missing Actions (.action-stack)');
      if (out.errors.length) return out;

      const r = (el) => el.getBoundingClientRect();
      const tr = r(tb), r1 = r(topic), r2 = r(diff), r3 = r(len), ra = r(actions);
      const g12 = Math.round(r2.left - r1.right);
      const g23 = Math.round(r3.left - r2.right);
      const g3A = Math.round(ra.left - r3.right);
      const inside = ra.right <= tr.right + 0.5 && ra.left >= tr.left - 0.5;
      const sameRow = Math.max(r1.top, r2.top, r3.top) - Math.min(r1.top, r2.top, r3.top) < 3;
      const heights = [r1.height, r2.height, r3.height].map((x)=>Math.round(x));
      const centers = [r1, r2, r3].map((b)=>Math.round(b.top + b.height/2));
      const gridOuter = getComputedStyle(tb).gridTemplateColumns;
      const gridLeft = left !== tb ? getComputedStyle(left).gridTemplateColumns : '(flat)';

      // Highlight elements for the screenshot
      topic.style.outline = '2px solid #7aa2ff';
      diff.style.outline = '2px solid #7aa2ff';
      len.style.outline = '2px solid #7aa2ff';
      actions.style.outline = '2px dashed #ffb74a';

      return { g12, g23, g3A, inside, sameRow, heights, centers, gridOuter, gridLeft,
               boxes: { toolbar: tr, topic: r1, difficulty: r2, length: r3, actions: ra },
               found: out.found, selectors: out.selectors, errors: out.errors };
    });

    if (!metrics || metrics.errors?.length) {
      failures.push({ viewport: vp.name, reason: 'missing-toolbar-elements', details: metrics });
    } else {
      const tol = 2; // px gap tolerance
      const okEqual = Math.abs(metrics.g12 - metrics.g23) <= tol;
      const okLast = Math.abs(metrics.g23 - metrics.g3A) <= tol; // last gap similar to others
      const okRow = process.env.UI_CHECK_SAME_ROW === '0' && vp.name === 'mobile' ? true : !!metrics.sameRow;
      if (!okEqual || !okLast || !okRow) {
        failures.push({ viewport: vp.name, reason: 'layout-misaligned', details: metrics,
          hints: [
            !okRow ? 'Fields not on the same row — check nested trio grid at this width.' : null,
            !okEqual ? `Gap Topic→Diff (${metrics.g12}px) vs Diff→Len (${metrics.g23}px) differs` : null,
            !okLast ? `Len→Actions gap (${metrics.g3A}px) not similar to field gaps` : null,
          ].filter(Boolean)
        });
      }
      if (!metrics.inside) failures.push({ viewport: vp.name, reason: 'actions-overflow', details: metrics });
    }

    const snap = await page.screenshot({ fullPage: false });
    writeFileSync(join(artifactsDir, `toolbar-${vp.name}.png`), snap);
    try { writeFileSync(join(artifactsDir, `toolbar-${vp.name}.json`), JSON.stringify(metrics, null, 2)); } catch {}
  }

  await browser.close();
  try { server && server.close(); } catch {}

  if (failures.length) {
    const pretty = failures.map(f => {
      const m = f.details || {};
      const lines = [];
      lines.push(`- Viewport: ${f.viewport}`);
      lines.push(`  Reason: ${f.reason}`);
      if (m.errors?.length) lines.push(`  Missing: ${m.errors.join('; ')}`);
      if (m.found) lines.push(`  Found: ${Object.entries(m.found).filter(([,v])=>v).map(([k])=>k).join(', ')}`);
      if (m.selectors) lines.push(`  Selectors: topic=${m.selectors.topic}, difficulty=${m.selectors.difficulty}, length=${m.selectors.length}, actions=${m.selectors.actions}`);
      if (m.gridOuter) lines.push(`  Grid (outer): ${m.gridOuter}`);
      if (m.gridLeft) lines.push(`  Grid (left): ${m.gridLeft}`);
      if (typeof m.g12 === 'number') lines.push(`  Gaps: T→D=${m.g12}px, D→L=${m.g23}px, L→A=${m.g3A}px`);
      if (m.centers) lines.push(`  Centers (y): ${m.centers.join(', ')}`);
      if (f.hints?.length) lines.push(`  Hints: ${f.hints.join(' | ')}`);
      lines.push(`  Artifacts: .artifacts/ui/toolbar-${f.viewport}.png${m ? ' + .json' : ''}`);
      return lines.join('\n');
    }).join('\n');
    console.error('[ui-check] FAIL\n' + pretty);
    process.exitCode = 1;
  } else {
    console.log('[ui-check] All viewports look good. Artifacts in ./.artifacts/ui');
  }
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
