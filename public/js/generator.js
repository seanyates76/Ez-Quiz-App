import { S } from './state.js';
import { $, byQSA, mmSsToMs } from './utils.js';
import { parseEditorInput } from './parser.js';
import { generateWithAI } from './api.js';
import { showVeil, hideVeil, MESSAGES } from './veil.js';
import { applyTheme, saveSettingsToStorage, getAlwaysShowAdvanced } from './settings.js';
import { STORAGE_KEYS } from './state.js';

export function runParseFlow(sourceText, topicLabel, fullTitle){
  const mirror = $('mirror');
  const startBtn = $('startBtn');
  const { questions, errors } = parseEditorInput(sourceText);
  S.quiz.questions = questions;
  // Preserve the full original question set for future full retakes
  S.quiz.originalQuestions = Array.isArray(questions) ? questions.slice() : [];
  // Map current question indexes to original indexes (identity on first parse)
  S.quiz.indexMap = questions.map((_, i) => i);
  // Reset original answers snapshot (one slot per original question)
  S.quiz.originalAnswers = new Array(questions.length).fill(null);
  S.quiz.index = 0;
  S.quiz.answers = new Array(questions.length).fill(null);
  if (topicLabel) { S.quiz.topic = String(topicLabel).trim(); }
  if (fullTitle) { S.quiz.title = String(fullTitle).trim(); } else { S.quiz.title = S.quiz.title || ''; }
  S.mode = 'generated';
  if(mirror) { mirror.value = sourceText; try{ const box=document.getElementById('mirrorBox'); const empty = !(sourceText||'').trim(); mirror.setAttribute('data-empty', empty?'true':'false'); if(box) box.setAttribute('data-empty', empty?'true':'false'); }catch{} }
  // Persist last quiz lines for quick restore
  try{ localStorage.setItem('ezq.last', String(sourceText||'')); }catch{}

  const statusBox = $('status');
  if(errors.length){
    statusBox && (statusBox.textContent = `Parsed ${questions.length} question(s). ${errors.length} error(s). ${errors.slice(0,5).join(' | ')}`);
    try{ const pe = document.getElementById('parseErrors'); if(pe){ pe.textContent = errors.join(' | '); pe.classList.remove('visually-hidden'); } }catch{}
  }
  else {
    statusBox && (statusBox.textContent = `Parsed ${questions.length} question(s).`);
    try{ const pe = document.getElementById('parseErrors'); if(pe){ pe.textContent = ''; pe.classList.add('visually-hidden'); } }catch{}
  }
  if(startBtn) startBtn.disabled = questions.length === 0;
}

export function wireGenerator({ beginQuiz, syncSettingsFromUI }){
  const generateBtn = $('generateBtn');
  const topicInput = $('topicInput');
  const countInput = $('countInput');
  const pbTopic = $('pbTopic');
  const pbCount = $('pbCount');
  const editor = $('editor');
  const mirror = $('mirror');
  const statusBox = $('status');

  const optionsBtn = $('optionsBtn');
  const optionsPanel = $('optionsPanel');
  const advDisclosure = document.querySelector('.advanced-disclosure');
  const advBlock = $('advancedBlock');
  const mirrorToggle = $('mirrorToggle');
  const mirrorBox = document.getElementById('mirrorBox');
  const difficultyInput = $('difficultyInput');
  const copyPromptsBtn = $('copyPromptsBtn');
  const exportTxtBtn = $('exportTxtBtn');

  // Options: controls
  const optTimerEnabled = $('optTimerEnabled');
  const optCountdownMode = $('optCountdownMode');
  const optTimerDuration = $('optTimerDuration');
  const optThemeRadios = byQSA('input[name="optTheme"]');
  const saveDefaultsBtn = $('saveDefaultsBtn');
  const resetDefaultsBtn = $('resetDefaultsBtn');
  const defaultsStatus = $('defaultsStatus');
  // Types checkboxes
  const qtMC = $('qtMC');
  const qtTF = $('qtTF');
  const qtYN = $('qtYN');
  const qtMT = $('qtMT');
  // Advanced row Start button removed; primary toolbar button handles Start/Generate

  // Primary action mode machine
  function setPrimaryAction(mode){
    const m = (mode === 'generate') ? 'generate' : 'start';
    (window.EZQ.ui = window.EZQ.ui || {}).primaryMode = m;
    generateBtn?.setAttribute('data-mode', m);
    if (generateBtn) generateBtn.textContent = (m === 'generate') ? 'Generate' : 'Start';
  }
  // Initialize primary action based on advanced visibility
  setPrimaryAction(advBlock && !advBlock.hidden ? 'generate' : 'start');

  // Removed: Load .txt, Demo Set, Clear, Load last quiz (advanced row trimmed)

  generateBtn?.addEventListener('click', async ()=>{
    const mode = generateBtn?.getAttribute('data-mode') || 'start';
    const editorText = (editor?.value || '').trim();
    const topicTyped = (topicInput?.value || '').trim();
    // Prefer existing editor content (IE or manual paste) when present,
    // regardless of current mode. Fallback to AI only when editor is empty.
    if(editorText.length){
      runParseFlow(editorText, topicTyped || 'Custom', '');
      if(S.quiz.questions && S.quiz.questions.length){ syncSettingsFromUI(); beginQuiz(); }
      return;
    }
    // In Generate mode, always regenerate fresh content: clear editor/mirror first
    if(mode==='generate'){
      if(editor) editor.value = '';
      if(mirror){ mirror.value = ''; try{ const box=document.getElementById('mirrorBox'); mirror.setAttribute('data-empty','true'); if(box) box.setAttribute('data-empty','true'); }catch{} }
    }
    const topicRaw = (topicInput?.value || pbTopic?.value || '').trim();
    const topic = topicRaw || 'General knowledge';
    let count = parseInt((countInput?.value || pbCount?.value || '10'), 10); if(!Number.isFinite(count)) count = 10; count = Math.max(1, Math.min(50, count)); if(!topicRaw){ statusBox && (statusBox.textContent = 'Using default topic: General knowledge'); }
    // Gather options
    const types = [ qtMC?.checked ? 'MC':null, qtTF?.checked? 'TF':null, qtYN?.checked? 'YN':null, qtMT?.checked? 'MT':null ].filter(Boolean);
    const difficulty = (difficultyInput?.value || 'medium');
    try{
      statusBox && (statusBox.textContent = 'Generating via AI…');
      generateBtn.disabled = true;
      showVeil(Math.floor(Math.random()*MESSAGES.length));
      const out = await generateWithAI(topic, count, { types, difficulty });
      const lines = out && out.lines || '';
      if(!lines){ statusBox && (statusBox.textContent = 'AI did not return any lines. Try again or use the Prompt Builder.'); generateBtn.disabled = false; hideVeil('Nothing yet…'); return; }
      if(editor) editor.value = lines;
      if(mirror){ mirror.value = lines; try{ const box=document.getElementById('mirrorBox'); const empty = !(lines||'').trim(); mirror.setAttribute('data-empty', empty?'true':'false'); if(box) box.setAttribute('data-empty', empty?'true':'false'); }catch{} } /* mirror stays hidden by default */
      // Auto-show Mirror when content exists so it’s visible on mobile too
      try{ setMirrorVisible(true); }catch{}
      const title = (out && out.title) ? out.title : '';
      runParseFlow(lines, topic, title);
      if (mode==='start' && S.quiz.questions && S.quiz.questions.length) { syncSettingsFromUI(); beginQuiz(); }
    }catch(err){
      const msg = String(err && err.message || err || 'Error'); let pretty = msg;
      try { const parsed = JSON.parse(msg); const status = parsed.status; const body = parsed.body; if(status === 429 || /quota|rate limit/i.test(JSON.stringify(body))){ pretty = 'Rate limit hit. Please wait ~30s and try again.'; } else if (typeof body === 'object' && body && body.error){ pretty = body.error; } } catch {}
      statusBox && (statusBox.textContent = `Generation failed: ${pretty}`);
    }finally{ generateBtn.disabled = false; hideVeil('Done'); }
  });

  // Options drop-down toggle
  function reflectOptionsFromSettings(){
    if(optTimerEnabled) optTimerEnabled.checked = !!S.settings.timerEnabled;
    if(optCountdownMode) optCountdownMode.checked = !!S.settings.countdown;
    if(optTimerDuration){
      const ms = Number(S.settings.durationMs||0);
      if(ms>0){ const total = Math.floor(ms/1000); const mm = Math.floor(total/60); const ss = total%60; optTimerDuration.value = String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0'); }
      else { optTimerDuration.value = ''; }
    }
    optThemeRadios.forEach(r=>{ r.checked = (r.value===S.settings.theme); });
    // Sync mirror toggle from container state
    const isOn = !!(mirrorBox && mirrorBox.getAttribute('data-on') === 'true');
    setMirrorVisible(isOn);
  }
  function applyMirrorToggle(){ const on = !!mirrorToggle?.checked; setMirrorVisible(on); }
  function openOptions(){ if(!optionsPanel) return; optionsPanel.hidden = false; optionsBtn?.setAttribute('aria-expanded','true'); reflectOptionsFromSettings(); applyMirrorToggle(); if(advDisclosure && advBlock){ const shouldOpen = !!getAlwaysShowAdvanced(); advDisclosure.setAttribute('aria-expanded', shouldOpen? 'true':'false'); advBlock.hidden = !shouldOpen; setPrimaryAction(shouldOpen? 'generate':'start'); } document.addEventListener('keydown', onEscCloseOptions); document.addEventListener('click', onDocClick, true); }
  function closeOptions(){ if(!optionsPanel) return; optionsPanel.hidden = true; optionsBtn?.setAttribute('aria-expanded','false'); document.removeEventListener('keydown', onEscCloseOptions); document.removeEventListener('click', onDocClick, true); setPrimaryAction('start'); optionsBtn?.focus(); }
  function onEscCloseOptions(e){ if(e.key==='Escape'){ e.preventDefault(); closeOptions(); }}
  optionsBtn?.addEventListener('click', ()=>{ if(optionsPanel?.hidden){ openOptions(); } else { closeOptions(); } });
  // Click-away to close
  function onDocClick(e){
    if(!optionsPanel || optionsPanel.hidden) return;
    const t = e.target;
    if(t===optionsBtn || optionsBtn?.contains(t)) return;
    // Do not close when clicking the primary Generate/Start button
    if(t===generateBtn || generateBtn?.contains(t)) return;
    if(optionsPanel.contains(t)) return;
    // Allow clicks on primary toolbar inputs without closing Options
    const allow = [topicInput, countInput, difficultyInput].filter(Boolean);
    for(const el of allow){ if(el && (t===el || el.contains?.(t))) return; }
    closeOptions();
  }
  // Click-away listener is attached only while open (see openOptions/closeOptions)

  // Advanced disclosure behavior
  function toggleAdvanced(open){ if(!advDisclosure||!advBlock) return; const willOpen = (open===undefined) ? (advDisclosure.getAttribute('aria-expanded')!=='true') : !!open; advDisclosure.setAttribute('aria-expanded', String(willOpen)); advBlock.hidden = !willOpen; setPrimaryAction(willOpen? 'generate':'start'); }
  advDisclosure?.addEventListener('click', ()=> toggleAdvanced());
  advDisclosure?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleAdvanced(); } else if(e.key==='Escape'){ e.preventDefault(); closeOptions(); }});
  if(advBlock){ const mo = new MutationObserver(()=>{ setPrimaryAction(advBlock.hidden ? 'start':'generate'); }); mo.observe(advBlock, { attributes:true, attributeFilter:['hidden','class','style'] }); }

  // Focus trap for Options panel when open
  function trapFocusOptions(e){
    if(!optionsPanel || optionsPanel.hidden) return; if(e.key!=='Tab') return;
    const els = Array.from(optionsPanel.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'));
    if(!els.length) return; const first=els[0], last=els[els.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', trapFocusOptions);

  // Mirror toggle
  function setMirrorVisible(on){ if(mirrorBox){ mirrorBox.setAttribute('data-on', on ? 'true':'false'); } if(mirrorToggle){ mirrorToggle.checked = !!on; } }
  // Debounced mirror toggle; keep container height stable
  let mirrorToggleBusy = false;
  mirrorToggle?.addEventListener('change', ()=>{
    if(mirrorToggleBusy) return;
    mirrorToggleBusy = true;
    setMirrorVisible(!!mirrorToggle.checked);
    setTimeout(()=>{ mirrorToggleBusy = false; }, 180);
  });

  // Options: Settings wiring
  optTimerEnabled?.addEventListener('change', ()=>{ S.settings.timerEnabled=!!optTimerEnabled.checked; saveSettingsToStorage(); });
  optCountdownMode?.addEventListener('change', ()=>{ S.settings.countdown=!!optCountdownMode.checked; saveSettingsToStorage(); });
  optTimerDuration?.addEventListener('input', ()=>{ S.settings.durationMs = mmSsToMs(optTimerDuration.value||''); saveSettingsToStorage(); });
  optThemeRadios.forEach(r=> r.addEventListener('change', ()=>{ if(r.checked){ applyTheme(r.value); }}));
  saveDefaultsBtn?.addEventListener('click', ()=>{
    // Save current generation defaults (Count/Difficulty/Types)
    saveDefaults(getCurrentGenDefaults());
    saveSettingsToStorage();
    if(defaultsStatus){ defaultsStatus.textContent = 'Defaults saved.'; }
  });
  resetDefaultsBtn?.addEventListener('click', ()=>{ clearDefaults(); applyDefaultsToUI(); });
  resetDefaultsBtn?.addEventListener('click', ()=>{ if(defaultsStatus){ defaultsStatus.textContent = 'Defaults cleared.'; } });

  // Starting a quiz now uses the primary toolbar button.
  // Copy / Export actions in Advanced
  function getMirrorText(){ return (mirror?.value || '').trim(); }
  copyPromptsBtn?.addEventListener('click', ()=>{ const t=getMirrorText(); if(!t){ statusBox && (statusBox.textContent='Nothing to copy. Generate first.'); return; } navigator.clipboard.writeText(t).then(()=>{ statusBox && (statusBox.textContent='Copied prompts.'); }).catch(()=>{ statusBox && (statusBox.textContent='Copy failed.'); }); });
  // Defaults storage (types, difficulty, count)
  function loadDefaults(){
    try{ const raw=localStorage.getItem(STORAGE_KEYS.defaults); if(!raw) return null; const obj=JSON.parse(raw); return obj && typeof obj==='object' ? obj : null; }catch{ return null; }
  }
  function saveDefaults(obj){ try{ localStorage.setItem(STORAGE_KEYS.defaults, JSON.stringify(obj||{})); statusBox && (statusBox.textContent='Defaults saved.'); }catch{} }
  function clearDefaults(){ try{ localStorage.removeItem(STORAGE_KEYS.defaults); statusBox && (statusBox.textContent='Defaults cleared.'); }catch{} }
  function getCurrentGenDefaults(){
    let count = parseInt(countInput?.value||'10',10); if(!Number.isFinite(count)) count=10; count=Math.max(1, Math.min(200, count));
    const difficulty = (difficultyInput?.value||'medium');
    const types = { MC: !!qtMC?.checked, TF: !!qtTF?.checked, YN: !!qtYN?.checked, MT: !!qtMT?.checked };
    return { count, difficulty, types };
  }
  function applyDefaultsToUI(){
    const d = loadDefaults(); if(!d) return;
    if(typeof d.count==='number' && countInput){ countInput.value = String(Math.max(1, Math.min(200, d.count))); }
    if(typeof d.difficulty==='string' && difficultyInput){ difficultyInput.value = d.difficulty; }
    if(d.types){ if(qtMC) qtMC.checked = !!d.types.MC; if(qtTF) qtTF.checked = !!d.types.TF; if(qtYN) qtYN.checked = !!d.types.YN; if(qtMT) qtMT.checked = !!d.types.MT; }
  }
  // Apply on init
  applyDefaultsToUI();
  exportTxtBtn?.addEventListener('click', ()=>{ const t=getMirrorText(); if(!t){ statusBox && (statusBox.textContent='Nothing to export. Generate first.'); return; } const blob=new Blob([t],{type:'text/plain'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='quiz-prompts.txt'; a.click(); URL.revokeObjectURL(url); statusBox && (statusBox.textContent='Exported quiz-prompts.txt'); });
  // Enter triggers generate
  topicInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); generateBtn?.click(); } });
  countInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); generateBtn?.click(); } });
  difficultyInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); generateBtn?.click(); } });
}
