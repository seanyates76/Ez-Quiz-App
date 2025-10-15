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

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: ['--no-sandbox','--disable-setuid-sandbox','--no-zygote','--single-process','--disable-gpu']
  });
  const page = await browser.newPage();

  ensureDir(artifactsDir);

  // Broad width sweep for scalability confidence
  const widthList = (process.env.UI_CHECK_WIDTHS || '').split(',').map(s=>parseInt(s,10)).filter(n=>Number.isFinite(n) && n>0);
  const defaults = [360, 390, 414, 600, 640, 720, 768, 800, 820, 834, 912, 1024, 1200, 1280, 1366, 1440];
  const widths = widthList.length ? widthList : defaults;
  const viewports = widths.map((w)=>({ name: `w${w}`, width: w, height: w < 740 ? 844 : 900 }));

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

    // Ensure Options is open, Quiz Editor is expanded, Interactive mode is on, and Mirror is visible
    try {
      await page.evaluate(() => {
        const qs = (id) => document.getElementById(id);
        const q = (sel, ctx=document) => ctx.querySelector(sel);

        // Open Options panel
        const optionsBtn = qs('optionsBtn');
        const optionsPanel = qs('optionsPanel');
        if (optionsPanel && optionsPanel.hidden) {
          if (optionsBtn && optionsBtn.click) optionsBtn.click();
          // Fallback if scripts are stripped
          if (optionsPanel.hidden) {
            optionsPanel.hidden = false;
            optionsBtn && optionsBtn.setAttribute && optionsBtn.setAttribute('aria-expanded','true');
          }
        }

        // Expand Quiz Editor disclosure
        const advDisclosure = q('.advanced-disclosure');
        const advBlock = qs('advancedBlock');
        if (advBlock && advBlock.hidden) {
          if (advDisclosure && advDisclosure.click) advDisclosure.click();
          if (advBlock.hidden) {
            advBlock.hidden = false;
            advDisclosure && advDisclosure.setAttribute && advDisclosure.setAttribute('aria-expanded','true');
          }
        }

        // Force Interactive mode ON
        const ieToggle = qs('toggleInteractiveEditor') || q('[data-role="quiz-editor-toggle"]');
        if (ieToggle && !ieToggle.checked) {
          ieToggle.checked = true;
          try { ieToggle.dispatchEvent(new Event('change', { bubbles:true })); } catch {}
        }
        // Reflect visibility if scripts are stripped
        const interactiveMount = qs('interactiveEditor');
        if (interactiveMount) interactiveMount.classList.remove('hidden');

        // Ensure Mirror is visible (Debug/Mirror toggle)
        const mirrorToggle = qs('mirrorToggle');
        const mirrorBox = qs('mirrorBox');
        if (mirrorToggle && !mirrorToggle.checked) {
          mirrorToggle.checked = true;
          try { mirrorToggle.dispatchEvent(new Event('change', { bubbles:true })); } catch {}
        }
        if (mirrorBox && mirrorBox.getAttribute('data-on') !== 'true') {
          mirrorBox.setAttribute('data-on','true');
        }
      });
      await sleep(120);
    } catch {}

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
      const diffBox = q('.toolbar-field--difficulty .difficulty-stack', left) || diff;
      const lenBox = q('.number-field .number-wrap', left) || len;
      const firstActionBtn = q('.action-stack button', tb) || actions;

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
      const tr = r(tb), rLeft = r(left), r1 = r(topic), r2 = r(diff), r3 = r(len), ra = r(actions);
      const g12 = Math.round(r2.left - r1.right);
      const g23 = Math.round(r3.left - r2.right);
      const g3A = Math.round(ra.left - r3.right);
      const inside = ra.right <= tr.right + 0.5 && ra.left >= tr.left - 0.5;
      const heights = [r1.height, r2.height, r3.height].map((x)=>Math.round(x));
      const centers = [r1, r2, r3].map((b)=>Math.round(b.top + b.height/2));
      const sameRow = Math.max(...centers) - Math.min(...centers) <= 4;
      const gridOuter = getComputedStyle(tb).gridTemplateColumns;
      const gridLeft = left !== tb ? getComputedStyle(left).gridTemplateColumns : '(flat)';

      // Visual gaps (interactive elements): Difficulty stack → Number wrap; Number wrap → first action button
      const rDiffBox = r(diffBox), rLenBox = r(lenBox), rActBtn = r(firstActionBtn);
      const v12 = Math.round(rLenBox.left - rDiffBox.right);
      const v3A = Math.round(rActBtn.left - rLenBox.right);

      // Vertical row gap (stacked toolbar rows)
      const vrToolbar = Math.round(ra.top - rLeft.bottom);

      // Editor mirror vs summary spacing (supports either order)
      const mirror = q('.mirror-box');
      const summary = q('#ieSummary') || q('.ie-summary');
      let vrEditor = null;
      let vrEditorDir = null; // 'summaryBelow' | 'mirrorBelow'
      if (mirror && summary) {
        const rm = r(mirror), rs = r(summary);
        if (rs.top > rm.bottom) {
          vrEditor = Math.round(rs.top - rm.bottom);
          vrEditorDir = 'summaryBelow';
        } else if (rm.top > rs.bottom) {
          vrEditor = Math.round(rm.top - rs.bottom);
          vrEditorDir = 'mirrorBelow';
        } else {
          // Overlap or zero gap: treat as 0 for reporting
          vrEditor = 0;
          vrEditorDir = 'overlap';
        }
      }

      // Highlight elements for the screenshot
      topic.style.outline = '2px solid #7aa2ff';
      diff.style.outline = '2px solid #7aa2ff';
      len.style.outline = '2px solid #7aa2ff';
      actions.style.outline = '2px dashed #ffb74a';

      const mbr = mirror ? r(mirror) : null;
      const sbr = summary ? r(summary) : null;
      const mirrorDisplay = mirror ? getComputedStyle(mirror).display : null;
      const summaryDisplay = summary ? getComputedStyle(summary).display : null;
      return { g12, g23, g3A, v12, v3A, vrToolbar, vrEditor, vrEditorDir, inside, sameRow, heights, centers, gridOuter, gridLeft,
               boxes: { toolbar: {top:tr.top,bottom:tr.bottom}, topic: {top:r1.top,bottom:r1.bottom}, difficulty: {top:r2.top,bottom:r2.bottom}, length: {top:r3.top,bottom:r3.bottom}, actions: {top:ra.top,bottom:ra.bottom}, mirror: mbr ? {top:mbr.top,bottom:mbr.bottom,height:mbr.height} : null, summary: sbr ? {top:sbr.top,bottom:sbr.bottom,height:sbr.height} : null },
               displays: { mirror: mirrorDisplay, summary: summaryDisplay },
               found: out.found, selectors: out.selectors, errors: out.errors };
    });

    if (!metrics || metrics.errors?.length) {
      failures.push({ viewport: vp.name, reason: 'missing-toolbar-elements', details: metrics });
    } else {
      const tol = 2; // px gap tolerance
      const isSmall = vp.width <= 912; // treat <=912px wide as small (tablet portrait included)
      const enforceRow = process.env.UI_CHECK_SAME_ROW === '1' ? true : !isSmall;
      const okRow = enforceRow ? !!metrics.sameRow : true;
      const checkGaps = !!metrics.sameRow; // only when trio is on same row
      const okEqual = !checkGaps || Math.abs(metrics.g12 - metrics.g23) <= tol;
      // Last gap is allowed to stretch; it must be at least as big as D→L
      const okLast = !checkGaps || (metrics.g3A >= metrics.g23 - tol);
      // Visual gap constraints: keep v12 ~10px (6–14 ok); ensure v3A >= 8px
      const okV12 = !checkGaps || (typeof metrics.v12 === 'number' ? (metrics.v12 >= 6 - tol && metrics.v12 <= 14 + tol) : true);
      const okV3A = !checkGaps || (typeof metrics.v3A === 'number' ? (metrics.v3A >= 8 - tol) : true);
      // Vertical row gaps: mobile toolbar rows need ≥ ~16px; editor mirror→summary needs ≥ ~16px
      const okVrToolbar = (!checkGaps && typeof metrics.vrToolbar === 'number') ? (metrics.vrToolbar >= 14) : true;
      const okVrEditor = (typeof metrics.vrEditor === 'number') ? (metrics.vrEditor >= 14) : true;

      if (!okRow || !okEqual || !okLast || !okV12 || !okV3A || !okVrToolbar || !okVrEditor) {
        failures.push({ viewport: vp.name, reason: 'layout-misaligned', details: metrics,
          hints: [
            enforceRow && !okRow ? 'Fields not on the same row — trio must be one line at this width.' : null,
            checkGaps && !okEqual ? `Gap Topic→Diff (${metrics.g12}px) vs Diff→Len (${metrics.g23}px) differs` : null,
            checkGaps && !okLast ? `Len→Actions gap (${metrics.g3A}px) should be >= Diff→Len (${metrics.g23}px)` : null,
            checkGaps && !okV12 ? (typeof metrics.v12==='number' ? `Visual gap Diff→Len (v12=${metrics.v12}px) should be ~10px (6–14px acceptable)` : 'Visual gap Diff→Len missing') : null,
            checkGaps && !okV3A ? (typeof metrics.v3A==='number' ? `Visual gap Len→Actions (v3A=${metrics.v3A}px) should be >= 8px` : 'Visual gap Len→Actions missing') : null,
            (!checkGaps && !okVrToolbar) ? (typeof metrics.vrToolbar==='number' ? `Toolbar row gap too small (vrToolbar=${metrics.vrToolbar}px, need ≥14px)` : 'Toolbar row gap missing') : null,
            (!okVrEditor) ? (typeof metrics.vrEditor==='number' ? `Mirror↔Summary vertical gap too small (vrEditor=${metrics.vrEditor}px, need ≥14px)` : 'Mirror↔Summary gap missing') : null,
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
