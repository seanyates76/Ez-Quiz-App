import { S } from './state.js';
import { $, byQSA } from './utils.js';
import { parseEditorInput } from './parser.js';
import { generateWithAI } from './api.js';
import { showVeil, hideVeil, MESSAGES } from './veil.js';

export function runParseFlow(sourceText, topicLabel, fullTitle){
  const mirror = $('mirror');
  const startBtn = $('startBtn');
  const { questions, errors } = parseEditorInput(sourceText);
  S.quiz.questions = questions;
  S.quiz.index = 0;
  S.quiz.answers = new Array(questions.length).fill(null);
  if (topicLabel) { S.quiz.topic = String(topicLabel).trim(); }
  if (fullTitle) { S.quiz.title = String(fullTitle).trim(); } else { S.quiz.title = S.quiz.title || ''; }
  S.mode = 'generated';
  if(mirror) mirror.value = sourceText;

  const statusBox = $('status');
  if(errors.length){ statusBox && (statusBox.textContent = `Parsed ${questions.length} question(s). ${errors.length} error(s). ${errors.slice(0,5).join(' | ')}`); }
  else { statusBox && (statusBox.textContent = `Parsed ${questions.length} question(s).`); }
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

  const loadBtn = $('loadBtn');
  const fileInput = $('fileInput');
  const demoBtn = $('demoBtn');
  const clearBtn = $('clearBtn');
  const advancedToggleBtn = $('advancedToggleBtn');

  loadBtn?.addEventListener('click', ()=> fileInput?.click());
  fileInput?.addEventListener('change', ()=>{
    const f = fileInput.files && fileInput.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = () => { const text = String(reader.result || ''); if(editor) editor.value = text; if(mirror) mirror.value = text; runParseFlow(text, f.name || 'Imported', ''); statusBox && (statusBox.textContent = `Loaded ${f.name} (${text.length} chars)`); };
    reader.onerror = () => { statusBox && (statusBox.textContent = 'Failed to read file'); };
    reader.readAsText(f);
  });

  demoBtn?.addEventListener('click', ()=>{
    const demo = [
      'MC|Which planet is known as the Red Planet?|A) Venus;B) Mars;C) Jupiter;D) Saturn|B',
      'MC|Select prime numbers.|A) 2;B) 4;C) 5;D) 9|A,C',
      'TF|The Pacific Ocean is larger than the Atlantic.|T',
      'YN|Is 0 an even number?|Y',
      'MT|Match ports to services.|1) 22;2) 53|A) SSH;B) DNS|1-A,2-B',
      'TF|Lightning never strikes the same place twice.|F',
    ].join('\n');
    if(editor) editor.value = demo; if(mirror) mirror.value = demo; runParseFlow(demo, 'Demo', '');
  });

  clearBtn?.addEventListener('click', ()=>{ if(editor) editor.value = ''; if(mirror) mirror.value = ''; const startBtn=$('startBtn'); if(startBtn) startBtn.disabled = true; statusBox && (statusBox.textContent = 'Cleared.'); });

  generateBtn?.addEventListener('click', async ()=>{
    const editorText = (editor?.value || '').trim();
    if(editorText.length){ runParseFlow(editorText, topicInput?.value || 'Custom', ''); return; }
    const topicRaw = (topicInput?.value || pbTopic?.value || '').trim();
    const topic = topicRaw || 'General knowledge';
    let count = parseInt((countInput?.value || pbCount?.value || '10'), 10); if(!Number.isFinite(count)) count = 10; count = Math.max(1, Math.min(50, count)); if(!topicRaw){ statusBox && (statusBox.textContent = 'Using default topic: General knowledge'); }
    try{
      statusBox && (statusBox.textContent = 'Generating via AI…');
      generateBtn.disabled = true;
      showVeil(Math.floor(Math.random()*MESSAGES.length));
      const out = await generateWithAI(topic, count);
      const lines = out && out.lines || '';
      if(!lines){ statusBox && (statusBox.textContent = 'AI did not return any lines. Try again or use the Prompt Builder.'); generateBtn.disabled = false; hideVeil('Nothing yet…'); return; }
      if(editor) editor.value = lines; if(mirror) mirror.value = lines;
      const title = (out && out.title) ? out.title : '';
      runParseFlow(lines, topic, title);
      if (S.settings.autoStart && S.quiz.questions && S.quiz.questions.length) { syncSettingsFromUI(); beginQuiz(); }
    }catch(err){
      const msg = String(err && err.message || err || 'Error'); let pretty = msg;
      try { const parsed = JSON.parse(msg); const status = parsed.status; const body = parsed.body; if(status === 429 || /quota|rate limit/i.test(JSON.stringify(body))){ pretty = 'Rate limit hit. Please wait ~30s and try again.'; } else if (typeof body === 'object' && body && body.error){ pretty = body.error; } } catch {}
      statusBox && (statusBox.textContent = `Generation failed: ${pretty}`);
    }finally{ generateBtn.disabled = false; hideVeil('Done'); }
  });

  // Advanced toggle
  advancedToggleBtn?.addEventListener('click', ()=>{ const d = $('manualMenu'); if(!d) return; const open = d.hasAttribute('open'); if(open) d.removeAttribute('open'); else d.setAttribute('open',''); });
  // Enter triggers generate
  topicInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); generateBtn?.click(); } });
  countInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); generateBtn?.click(); } });
}

