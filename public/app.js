(() => {
const $ = (id) => document.getElementById(id);
const byQSA = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function pad2(n){ return String(n).padStart(2,'0'); }
function formatDuration(ms){
if(!ms || ms < 0) ms = 0;
const total = Math.floor(ms/1000);
const mm = Math.floor(total/60);
const ss = total % 60;
return `${pad2(mm)}:${pad2(ss)}`;
}
function arraysEqual(a,b){ if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length) return false; for(let i=0;i<a.length;i++){ if(a[i]!==b[i]) return false; } return true; }
function escapeHTML(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll('&#39;','&#39;'); }
function normalizeLettersToIndexes(letterStr){
if(!letterStr) return []; return letterStr.split(',').map(s=>s.trim()).filter(Boolean).map(ch => ch.toUpperCase().charCodeAt(0) - 65).filter(n => n >= 0);
}
function indexesToLetters(idxs){ return (idxs||[]).map(i => String.fromCharCode(65 + i)); }
function msToMmSs(ms){ if(!ms || ms<=0) return ''; const mm = Math.floor(ms/60000), ss = Math.floor((ms%60000)/1000); return `${pad2(mm)}:${pad2(ss)}`; }
function mmSsToMs(txt){
const s=(txt||'').trim(); if(!s) return 0;
const parts=s.split(':'); if(parts.length===2){ const mm=parseInt(parts[0],10)||0; const ss=parseInt(parts[1],10)||0; return (mm*60+ss)*1000; }
const mm=parseInt(s,10)||0; return mm*60*1000;
}

// Elements
const generatorCard = $('generatorCard');
const editor = $('editor');
const mirror = $('mirror');
const statusBox = $('status');
const generateBtn = $('generateBtn');
const startBtn = $('startBtn');

const quizView = $('quizView');
const questionHost = $('questionHost');
const timerEl = $('timer');
const prevBtn = $('prevBtn');
const nextBtn = $('nextBtn');
const finishBtn = $('finishBtn');
const progBar = $('progBar');
const qCounter = $('qCounter');
const backDuringQuiz = $('backDuringQuiz');

const resultsView = $('resultsView');
const resultsSummary = $('resultsSummary');
const missedList = $('missedList');
const retakeBtn = $('retakeBtn');
const backToMenuBtn = $('backToMenuBtn');

const helpBtn = $('helpBtn');
const settingsBtn = $('settingsBtn');
const promptBtn = $('promptBtn');
const helpModal = $('helpModal');
const settingsModal = $('settingsModal');
const promptModal = $('promptModal');
const helpClose = $('helpClose');
const helpOk = $('helpOk');
const settingsClose = $('settingsClose');
const settingsSave = $('settingsSave');

const timerEnabledEl = $('timerEnabled');
const countdownModeEl = $('countdownMode');
const timerDurationEl = $('timerDuration');

const resetApp = $('resetApp');

const pbTopic = $('pbTopic');
const pbCount = $('pbCount');
const pbCancel = $('pbCancel');
const pbCopy = $('pbCopy');

// Toolbar inputs on landing
const topicInput = $('topicInput');
const countInput = $('countInput');
const difficultyInput = $('difficultyInput');
const advancedToggleBtn = $('advancedToggleBtn');

// State
window.EZQ = window.EZQ || {};
const S = window.EZQ;
S.mode = S.mode || 'idle';
S.quiz = S.quiz || { questions: [], index: 0, answers: [], score: 0, startedAt: 0, finishedAt: 0, endAt: 0 };
S.settings = S.settings || { theme: 'dark', timerEnabled: false, countdown: false, durationMs: 0 };

let timerInterval = null;
let pausedAt = 0, elapsedOffset = 0, remainingOnPause = 0;

// Persistence
const STORAGE_KEYS = { theme: 'ezq.theme', settings: 'ezq.settings' };
function saveSettingsToStorage(){ try{ localStorage.setItem(STORAGE_KEYS.theme, S.settings.theme); localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ timerEnabled: !!S.settings.timerEnabled, countdown: !!S.settings.countdown, durationMs: Number(S.settings.durationMs||0) })); }catch{} }
function loadSettingsFromStorage(){
try{ const t=localStorage.getItem(STORAGE_KEYS.theme); if(t==='light'||t==='dark') S.settings.theme=t; }catch{}
try{ const raw=localStorage.getItem(STORAGE_KEYS.settings); if(raw){ const obj=JSON.parse(raw); S.settings.timerEnabled=!!obj.timerEnabled; S.settings.countdown=!!obj.countdown; S.settings.durationMs=Number(obj.durationMs||0); } }catch{}
}
function applyTheme(theme){ const t=(theme==='light'||theme==='dark')?theme:'dark'; S.settings.theme=t; document.body.setAttribute('data-theme', t); saveSettingsToStorage(); }
function reflectSettingsIntoUI(){ byQSA('input[name="theme"]').forEach(r=>{ r.checked=(r.value===S.settings.theme); }); if(timerEnabledEl) timerEnabledEl.checked=!!S.settings.timerEnabled; if(countdownModeEl) countdownModeEl.checked=!!S.settings.countdown; if(timerDurationEl) timerDurationEl.value=msToMmSs(S.settings.durationMs); }
function wireSettingsPanel(){
byQSA('input[name="theme"]').forEach(radio=>{ radio.addEventListener('change', ()=>{ if(radio.checked) applyTheme(radio.value); }); });
timerEnabledEl?.addEventListener('change', ()=>{ S.settings.timerEnabled=!!timerEnabledEl.checked; saveSettingsToStorage(); });
countdownModeEl?.addEventListener('change', ()=>{ S.settings.countdown=!!countdownModeEl.checked; saveSettingsToStorage(); });
timerDurationEl?.addEventListener('input', ()=>{ S.settings.durationMs=mmSsToMs(timerDurationEl.value); saveSettingsToStorage(); });
settingsClose?.addEventListener('click', ()=> closeModal('settingsModal'));
settingsSave?.addEventListener('click', ()=> closeModal('settingsModal'));
}

// Modals + timer pause/resume
function openModal(id){ const el=$(id); if(!el) return; if(id==='settingsModal'){ reflectSettingsIntoUI(); } el.classList.add('is-open'); el.setAttribute('aria-hidden','false'); const f=el.querySelector('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'); if(f) f.focus(); pauseTimerIfQuiz(); }
function closeModal(id){ const el=$(id); if(!el) return; el.classList.remove('is-open'); el.setAttribute('aria-hidden','true'); resumeTimerIfQuiz(); }
helpBtn?.addEventListener('click', ()=> openModal('helpModal'));
settingsBtn?.addEventListener('click', ()=> openModal('settingsModal'));
promptBtn?.addEventListener('click', ()=> openModal('promptModal'));
helpClose?.addEventListener('click', ()=> closeModal('helpModal'));
helpOk?.addEventListener('click', ()=> closeModal('helpModal'));
document.addEventListener('click', (e)=>{ const t=e.target; if(t && t.matches('.modal__backdrop')){ const id=t.getAttribute('data-close'); if(id) closeModal(id); } });

// Reset
resetApp?.addEventListener('click', ()=>{ try{ localStorage.clear(); }catch{} location.reload(); });

// Advanced panel toggle button mirrors <summary>
advancedToggleBtn?.addEventListener('click', ()=>{
  const d = document.getElementById('manualMenu');
  if(!d) return;
  const open = d.hasAttribute('open');
  if(open) d.removeAttribute('open'); else d.setAttribute('open','');
});

// Prompt builder (unchanged copy logic – kept for parity)
function buildPromptTemplate(topic, count){
const n=Math.max(1,parseInt(count||1,10)); const safeTopic=(topic||'CompTIA A+ 2025 Core 1').trim();
return [
`Hi AI helper, make a quiz ${n} questions long about ${safeTopic} with this EXACT format.`, 
`Output ONLY the quiz lines. No commentary, no numbering, no blank lines.`, 
`Formats allowed (mix them):`, 
`MC|Question?|A) Option 1;B) Option 2;C) Option 3;D) Option 4|A`, 
`MC|Question with multiple answers?|A) 1;B) 2;C) 3;D) 4|A,C`, 
`TF|A true/false statement.|T`, 
`YN|A yes/no question.|Y`, 
`MT|Match.|1) L1;2) L2;3) L3|A) R1;B) R2;C) R3|1-A,2-B,3-C`, 
`Rules:`, 
`- EXACTLY ${n} lines.`, 
`- Use only MC, TF, YN, MT.`, 
`- MC correct field may be single (e.g., A) or multiple (e.g., A,C).`, 
`- No extra punctuation beyond the shown delimiters.`
].join('\n');
}
async function copyToClipboard(text){ try{ await navigator.clipboard.writeText(text); }catch{ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);}
}
pbCopy?.addEventListener('click', async ()=>{ const t=buildPromptTemplate(pbTopic?.value, pbCount?.value); await copyToClipboard(t); closeModal('promptModal'); });
document.addEventListener('keydown', (e)=>{ const isMetaP=(e.key.toLowerCase()==='p')&&(e.ctrlKey||e.metaKey); if(!isMetaP) return; const a=document.activeElement; const tag=a?.tagName?.toLowerCase(); if(tag==='input'||tag==='textarea'||a?.isContentEditable) return; e.preventDefault(); openModal('promptModal'); });

// Parser
function parseEditorInput(text){
const lines=(text||'').split('\n').map(l=>l.trim()).filter(l=>l.length);
const questions=[], errors=[];
const MC_RE=/^MC\|(.*)\|(.+?)\|([A-Za-z](?:\s*,\s*[A-Za-z])*)$/i;
const TF_RE=/^TF\|(.*)\|(T|F)$/i;
const YN_RE=/^YN\|(.*)\|(Y|N)$/i;
const MT_RE=/^MT\|(.*)\|(.+?)\|(.+?)\|(.+?)$/i;

for(const [i,raw] of lines.entries()){
  const idx=i+1;
  if(MC_RE.test(raw)){
    const m=raw.match(MC_RE);
    try{
      const text=m[1].trim(), optRaw=m[2].trim(), corrRaw=m[3].trim();
      const options=optRaw.split(';').map(s=>s.trim().replace(/^[A-D]\)\s*/i,'').trim());
      const correct=normalizeLettersToIndexes(corrRaw);
      const bad=correct.find(c=>c<0||c>=options.length);
      if(bad!==undefined) throw new Error('MC correct out of range');
      questions.push({type:'MC', text, options, correct: correct.sort((a,b)=>a-b)});
    }catch{ errors.push(`Line ${idx}: MC parse error`); }
    continue;
  }
  if(TF_RE.test(raw)){
    const m=raw.match(TF_RE);
    try{ const text=m[1].trim(); const t=m[2].toUpperCase()==='T'; questions.push({type:'TF', text, correct:t}); }
    catch{ errors.push(`Line ${idx}: TF parse error`); }
    continue;
  }
  if(YN_RE.test(raw)){
    const m=raw.match(YN_RE);
    try{ const text=m[1].trim(); const y=m[2].toUpperCase()==='Y'; questions.push({type:'YN', text, correct:y}); }
    catch{ errors.push(`Line ${idx}: YN parse error`); }
    continue;
  }
  if(MT_RE.test(raw)){
    const m=raw.match(MT_RE);
    try{
      const text=m[1].trim(), leftRaw=m[2].trim(), rightRaw=m[3].trim(), pairsRaw=m[4].trim();
      const left=leftRaw.split(';').map(s=>s.trim().replace(/^\d+\)\s*/,'').trim()).filter(Boolean);
      const right=rightRaw.split(';').map(s=>s.trim().replace(/^[A-Z]\)\s*/i,'').trim()).filter(Boolean);
      const pairs=pairsRaw.split(',').map(p=>{ const m2=p.split('-').map(x=>x.trim()); const li=parseInt(m2[0],10)-1; const ri=m2[1].toUpperCase().charCodeAt(0)-65; return [li,ri]; });
      const invalid=pairs.some(([li,ri])=>li<0||li>=left.length||ri<0||ri>=right.length);
      if(invalid) throw new Error('MT pair out of range');
      questions.push({type:'MT', text, left, right, pairs});
    }catch{ errors.push(`Line ${idx}: MT parse error`); }
    continue;
  }
  errors.push(`Line ${idx}: Unknown or invalid format`);
}
return {questions, errors};
}

// API — AI generation
async function generateWithAI(topic, count){
const controller = new AbortController();
const id = setTimeout(()=>controller.abort(), 30000);
try{
const res = await fetch('/api/generate', {
method: 'POST',
headers: { 'Content-Type':'application/json' },
body: JSON.stringify({ topic, count }),
signal: controller.signal
});
clearTimeout(id);
  if(!res.ok){
    let body;
    try { body = await res.json(); } catch { body = await res.text().catch(()=>String(res.status)); }
    throw new Error(JSON.stringify({ status: res.status, body }));
  }
const data = await res.json();
return String(data.lines || '').trim();
}catch(err){
clearTimeout(id);
throw err;
}
}

function showStatus(msg){ if(statusBox) statusBox.textContent = msg || ''; }
function setMode(mode){
S.mode = mode;
if(mode==='quiz'){
generatorCard?.classList.add('is-hidden');
resultsView?.classList.add('is-hidden');
quizView?.classList.remove('is-hidden');
document.body.classList.add('is-quiz');
}else if(mode==='results'){
generatorCard?.classList.add('is-hidden');
quizView?.classList.add('is-hidden');
resultsView?.classList.remove('is-hidden');
document.body.classList.add('is-quiz');
}else{
generatorCard?.classList.remove('is-hidden');
quizView?.classList.add('is-hidden');
resultsView?.classList.add('is-hidden');
document.body.classList.remove('is-quiz');
}
}
function syncSettingsFromUI(){ S.settings.timerEnabled=!!(timerEnabledEl?.checked); S.settings.countdown=!!(countdownModeEl?.checked); S.settings.durationMs=mmSsToMs(timerDurationEl?.value||''); saveSettingsToStorage(); }

// Generator flow (manual or AI)
function wireGenerator(){
generateBtn?.addEventListener('click', async ()=>{
// If there is editor content, use manual flow
const editorText = (editor?.value || '').trim();
if(editorText.length){
runParseFlow(editorText);
return;
}
// Otherwise attempt AI generation using toolbar or Prompt Builder fields
const topic = (topicInput?.value || pbTopic?.value || 'General knowledge').trim();
const count = Math.max(1, parseInt((countInput?.value || pbCount?.value || '10'), 10));
try{
showStatus('Generating via AI…');
generateBtn.disabled = true;
showVeil(Math.floor(Math.random()*MESSAGES.length));
const lines = await generateWithAI(topic, count);
if(!lines){
showStatus('AI did not return any lines. Try again or use the Prompt Builder.');
generateBtn.disabled = false;
hideVeil('Nothing yet…');
return;
}
if(editor) editor.value = lines;
if(mirror) mirror.value = lines;
runParseFlow(lines);
}catch(err){
  const msg = String(err && err.message || err || 'Error');
  let pretty = msg;
  try {
    const parsed = JSON.parse(msg);
    const status = parsed.status;
    const body = parsed.body;
    if(status === 429 || /quota|rate limit/i.test(JSON.stringify(body))){
      pretty = 'Rate limit hit. Please wait ~30s and try again.';
    } else if (typeof body === 'object' && body && body.error){
      pretty = body.error;
    }
  } catch {}
  showStatus(`Generation failed: ${pretty}`);
}finally{
generateBtn.disabled = false;
 hideVeil('Done');
}
});

startBtn?.addEventListener('click', ()=>{
  if(!S.quiz.questions?.length) return;
  syncSettingsFromUI();
  beginQuiz();
});
}

function runParseFlow(sourceText){
const {questions, errors} = parseEditorInput(sourceText);
S.quiz.questions = questions;
S.quiz.index = 0;
S.quiz.answers = new Array(questions.length).fill(null);
S.mode = 'generated';
if(mirror) mirror.value = sourceText;

if(errors.length){
  showStatus(`Parsed ${questions.length} question(s). ${errors.length} error(s). ${errors.slice(0,5).join(' | ')}`);
}else{
  showStatus(`Parsed ${questions.length} question(s).`);
}
if(startBtn) startBtn.disabled = questions.length === 0;
}

// Runner
function beginQuiz(){
S.quiz.index = 0; S.quiz.score = 0; S.quiz.startedAt = Date.now(); S.quiz.finishedAt = 0;
clearInterval(timerInterval); timerInterval=null; pausedAt=0; elapsedOffset=0; remainingOnPause=0;
if(timerEl) timerEl.textContent = '';

if(S.settings.timerEnabled){
  if(S.settings.countdown && S.settings.durationMs>0){
    S.quiz.endAt = Date.now() + S.settings.durationMs;
    timerInterval = setInterval(tickCountdown, 1000);
    if(timerEl) timerEl.textContent = formatDuration(S.quiz.endAt - Date.now());
  }else{
    timerInterval = setInterval(tickStopwatch, 1000);
    if(timerEl) timerEl.textContent = '00:00';
  }
}

setMode('quiz');
renderCurrentQuestion();
updateNavButtons();
}
function tickStopwatch(){ const elapsed = Date.now() - S.quiz.startedAt - elapsedOffset; if(timerEl) timerEl.textContent = formatDuration(elapsed); }
function tickCountdown(){
const remain=S.quiz.endAt - Date.now();
if(timerEl) timerEl.textContent = formatDuration(remain);
if(remain<=0){ clearInterval(timerInterval); timerInterval=null; finishQuiz(true);}
}
function updateNavButtons(){
const i=S.quiz.index, total=S.quiz.questions.length;
if(prevBtn) prevBtn.disabled = i<=0;
if(nextBtn) nextBtn.disabled = i>=total-1;
  if(finishBtn){
    if(i>=total-1){
      finishBtn.classList.remove('is-hidden');
    }else{
      finishBtn.classList.add('is-hidden');
    }
  }
  updateProgress();
  updateCounter();
}

function renderCurrentQuestion(){
const q = S.quiz.questions[S.quiz.index];
if(!q){ questionHost.innerHTML = '<p>Missing question.</p>'; return; }
const n=S.quiz.index+1, total=S.quiz.questions.length;
let html = `<div class="qwrap">       <div class="qhdr"><strong>Question ${n}/${total}</strong></div>       <div class="qtext" style="margin:8px 0 12px">${escapeHTML(q.text)}</div>`;

if(q.type==='MC'){
  const user = Array.isArray(S.quiz.answers[S.quiz.index]) ? S.quiz.answers[S.quiz.index] : [];
  const multiple = Array.isArray(q.correct) && q.correct.length>1;
  if(multiple){
    html += `<div class="options">` + q.options.map((opt,i)=> {
      const checked = user.includes(i) ? 'checked' : '';
      return `<label class="opt"><input type="checkbox" data-idx="${i}" ${checked}/> <span>${escapeHTML(opt)}</span></label>`;
    }).join('') + `</div>`;
  }else{
    html += `<div class="options">` + q.options.map((opt,i)=> {
      const checked = user.includes(i) ? 'checked' : '';
      return `<label class="opt"><input type="radio" name="mc" data-idx="${i}" ${checked}/> <span>${escapeHTML(opt)}</span></label>`;
    }).join('') + `</div>`;
  }
} else if(q.type==='TF'){
  const user=S.quiz.answers[S.quiz.index];
  const tChecked=user===true?'checked':'', fChecked=user===false?'checked':'';
  html += `<div class="options">
    <label class="opt"><input type="radio" name="tf" data-bool="true" ${tChecked}/> True</label>
    <label class="opt"><input type="radio" name="tf" data-bool="false" ${fChecked}/> False</label>
  </div>`;
} else if(q.type==='YN'){
  const user=S.quiz.answers[S.quiz.index];
  const yChecked=user===true?'checked':'', nChecked=user===false?'checked':'';
  html += `<div class="options">
    <label class="opt"><input type="radio" name="yn" data-bool="true" ${yChecked}/> Yes</label>
    <label class="opt"><input type="radio" name="yn" data-bool="false" ${nChecked}/> No</label>
  </div>`;
} else if(q.type==='MT'){
  const user=Array.isArray(S.quiz.answers[S.quiz.index])?S.quiz.answers[S.quiz.index]:new Array(q.left.length).fill(-1);
  html += `<div class="mtwrap">` + q.left.map((L,li)=>{
    return `<div class="mtrow">
      <div class="mtleft">${escapeHTML(L)}</div>
      <div class="mtright">
        <select data-li="${li}">
          <option value="">— choose —</option>
          ${q.right.map((R,ri)=> `<option value="${ri}" ${user[li]===ri?'selected':''}>${String.fromCharCode(65+ri)}) ${escapeHTML(R)}</option>`).join('')}
        </select>
      </div>
    </div>`;
  }).join('') + `</div>`;
}

html += `</div>`;
questionHost.innerHTML = html;

if(q.type==='MC'){
  const multiple = q.correct.length>1;
  if(multiple){
    byQSA('input[type="checkbox"]', questionHost).forEach(cb=>{
      cb.addEventListener('change', ()=>{
        const i=parseInt(cb.getAttribute('data-idx'),10);
        const cur=Array.isArray(S.quiz.answers[S.quiz.index])?[...S.quiz.answers[S.quiz.index]]:[];
        if(cb.checked){ if(!cur.includes(i)) cur.push(i); } else { const at=cur.indexOf(i); if(at>=0) cur.splice(at,1); }
        S.quiz.answers[S.quiz.index] = cur.sort((a,b)=>a-b);
        try{ cb.blur(); }catch{}
      });
    });
  }else{
    byQSA('input[type="radio"][name="mc"]', questionHost).forEach(rb=>{
      rb.addEventListener('change', ()=>{
        const i=parseInt(rb.getAttribute('data-idx'),10);
        S.quiz.answers[S.quiz.index] = [i];
        try{ rb.blur(); }catch{}
      });
    });
  }
} else if(q.type==='TF'){
  byQSA('input[type="radio"][name="tf"]', questionHost).forEach(rb=>{
    rb.addEventListener('change', ()=>{
      const v=rb.getAttribute('data-bool')==='true';
      S.quiz.answers[S.quiz.index] = v;
      try{ rb.blur(); }catch{}
    });
  });
} else if(q.type==='YN'){
  byQSA('input[type="radio"][name="yn"]', questionHost).forEach(rb=>{
    rb.addEventListener('change', ()=>{
      const v=rb.getAttribute('data-bool')==='true';
      S.quiz.answers[S.quiz.index] = v;
      try{ rb.blur(); }catch{}
    });
  });
} else if(q.type==='MT'){
  byQSA('select[data-li]', questionHost).forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const li=parseInt(sel.getAttribute('data-li'),10);
      const ri= sel.value===''? -1 : parseInt(sel.value,10);
      const cur=Array.isArray(S.quiz.answers[S.quiz.index])?[...S.quiz.answers[S.quiz.index]]:new Array(q.left.length).fill(-1);
      cur[li]=ri;
      S.quiz.answers[S.quiz.index]=cur;
      try{ sel.blur(); }catch{}
    });
  });
}

function updateProgress(){
  const total = S.quiz.questions.length;
  if(!progBar || !total){ if(progBar) progBar.style.width='0%'; return; }
  const pct = Math.max(0, Math.min(100, Math.round(((S.quiz.index+1)/total)*100)));
  progBar.style.width = pct + '%';
}

function updateCounter(){
  const total = S.quiz.questions.length;
  if(!qCounter){ return; }
  if(!total){ qCounter.textContent = '0/0'; return; }
  const n = clamp(S.quiz.index + 1, 0, total);
  qCounter.textContent = `${n}/${total}`;
}
}

prevBtn?.addEventListener('click', (e)=>{ S.quiz.index=clamp(S.quiz.index-1,0,S.quiz.questions.length-1); renderCurrentQuestion(); updateNavButtons(); try{e.currentTarget.blur();}catch{} });
nextBtn?.addEventListener('click', (e)=>{ S.quiz.index=clamp(S.quiz.index+1,0,S.quiz.questions.length-1); renderCurrentQuestion(); updateNavButtons(); try{e.currentTarget.blur();}catch{} });

// Shortcuts
document.addEventListener('keydown', (e)=>{
if(S.mode!=='quiz') return;
const a=document.activeElement; const tag=a?.tagName?.toLowerCase();
if(tag==='input'||tag==='textarea'||a?.isContentEditable||tag==='select') return;
if(e.key === 'Enter' || e.key === 'ArrowRight'){
  e.preventDefault();
  if(S.quiz.index < S.quiz.questions.length-1){
    S.quiz.index++;
    renderCurrentQuestion();
    updateNavButtons();
  } else {
    // On last question, Enter/Right finishes
    finishQuiz(false);
  }
}else if(e.key === 'Backspace' || e.key === 'ArrowLeft'){
  e.preventDefault();
  if(S.quiz.index>0){
    S.quiz.index--;
    renderCurrentQuestion();
    updateNavButtons();
  }
}
});

// Finish → Results
finishBtn?.addEventListener('click', (e)=>{ finishQuiz(false); try{e.currentTarget.blur();}catch{} });

// Back to Menu during quiz
backDuringQuiz?.addEventListener('click', (e)=>{
  if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
  setMode('idle');
  try{e.currentTarget.blur();}catch{}
});
function finishQuiz(auto=false){
if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
S.quiz.finishedAt = Date.now();

let score=0;
const qs=S.quiz.questions, ans=S.quiz.answers;
for(let i=0;i<qs.length;i++){
  const q=qs[i], a=ans[i];
  if(q.type==='MC'){
    const user=Array.isArray(a)?a.slice().sort((x,y)=>x-y):[];
    const correct=(q.correct||[]).slice().sort((x,y)=>x-y);
    if(user.length && arraysEqual(user, correct)) score++;
  }else if(q.type==='TF' || q.type==='YN'){
    if(typeof a==='boolean' && a===q.correct) score++;
  }else if(q.type==='MT'){
    const user=Array.isArray(a)?a:[];
    const target=new Array(q.left.length).fill(-1); q.pairs.forEach(([li,ri])=>{ target[li]=ri; });
    if(user.length===target.length && arraysEqual(user, target)) score++;
  }
}
S.quiz.score=score;

renderResults();
setMode('results');
}

function renderResults(){
const total=S.quiz.questions.length;
const duration = S.quiz.finishedAt && S.quiz.startedAt ? (S.quiz.finishedAt - S.quiz.startedAt - elapsedOffset) : 0;
resultsSummary.innerHTML = `       <p><strong>Score:</strong> ${S.quiz.score}/${total}</p>       <p><strong>Time:</strong> ${formatDuration(Math.max(0, duration))}</p>
    `;

const missed=[];
for(let i=0;i<total;i++){
  const q=S.quiz.questions[i], a=S.quiz.answers[i];
  const correctView=viewCorrect(q), userView=viewUser(q,a);
  const isCorrect=compareQA(q,a);
  if(!isCorrect){ missed.push({ idx:i+1, text:q.text, userView, correctView }); }
}

if(!missed.length){
  missedList.innerHTML = `<div class="missed-item"><em>No missed questions 🎉</em></div>`;
  return;
}
missedList.innerHTML = missed.map(item => `
  <div class="missed-item">
    <div><strong>Q${item.idx}.</strong> ${escapeHTML(item.text)}</div>
    <div><strong>Your answer:</strong> ${escapeHTML(item.userView || '—')}</div>
    <div><strong>Correct:</strong> ${escapeHTML(item.correctView)}</div>
  </div>
`).join('');
}

function viewCorrect(q){
if(q.type==='MC'){ return indexesToLetters(q.correct).join(','); }
if(q.type==='TF'){ return q.correct ? 'T' : 'F'; }
if(q.type==='YN'){ return q.correct ? 'Y' : 'N'; }
if(q.type==='MT'){ return q.pairs.map(([li,ri]) => `${li+1}-${String.fromCharCode(65+ri)}`).join(','); }
return '';
}
function viewUser(q, a){
if(q.type==='MC'){ const arr=Array.isArray(a)?a:[]; return indexesToLetters(arr).join(','); }
if(q.type==='TF'){ if(typeof a!=='boolean') return ''; return a ? 'T' : 'F'; }
if(q.type==='YN'){ if(typeof a!=='boolean') return ''; return a ? 'Y' : 'N'; }
if(q.type==='MT'){ const arr=Array.isArray(a)?a:[]; return arr.map((ri,li)=> (ri<0?`${li+1}-?`:`${li+1}-${String.fromCharCode(65+ri)}`)).join(','); }
return '';
}
function compareQA(q, a){
if(q.type==='MC'){
  const user=Array.isArray(a)?a.slice().sort((x,y)=>x-y):[];
  const correct=(q.correct||[]).slice().sort((x,y)=>x-y);
  return user.length && arraysEqual(user, correct);
}
if(q.type==='TF' || q.type==='YN'){
  return typeof a==='boolean' && a===q.correct;
}
if(q.type==='MT'){
  const user=Array.isArray(a)?a:[];
  const target=new Array(q.left.length).fill(-1); q.pairs.forEach(([li,ri])=>{ target[li]=ri; });
  return user.length===target.length && arraysEqual(user, target);
}
return false;
}

// Results actions
retakeBtn?.addEventListener('click', () => {
  if (!Array.isArray(S.quiz?.questions) || S.quiz.questions.length === 0) {
    setMode('idle');
    return;
  }
  S.quiz.answers = new Array(S.quiz.questions.length).fill(null);
  beginQuiz();
});

backToMenuBtn?.addEventListener('click', () => {
  setMode('idle');
});

// Timer pause/resume
function pauseTimerIfQuiz(){
if(S.mode!=='quiz') return;
if(!timerInterval) return;
pausedAt = Date.now();
if(S.settings.timerEnabled){
if(S.settings.countdown && S.quiz.endAt){
remainingOnPause = Math.max(0, S.quiz.endAt - Date.now());
} else {
// stopwatch: compute offset on resume using pausedAt
}
}
clearInterval(timerInterval);
timerInterval = null;
}
function resumeTimerIfQuiz(){
if(S.mode!=='quiz') return;
if(timerInterval) return;
if(!S.settings.timerEnabled) return;

if(S.settings.countdown && S.settings.durationMs>0){
  if(remainingOnPause>0){
    S.quiz.endAt = Date.now() + remainingOnPause;
    remainingOnPause = 0;
  }
  timerInterval = setInterval(tickCountdown, 1000);
  if(timerEl) timerEl.textContent = formatDuration(S.quiz.endAt - Date.now());
}else{
  if(pausedAt){
    elapsedOffset += (Date.now() - pausedAt);
    pausedAt = 0;
  }
  timerInterval = setInterval(tickStopwatch, 1000);
}
}

// Init
function init(){
loadSettingsFromStorage();
applyTheme(S.settings.theme);
reflectSettingsIntoUI();
wireSettingsPanel();

// Ensure Advanced panel starts closed regardless of prior state
const adv=document.getElementById('manualMenu');
if(adv) adv.removeAttribute('open');

if(S.mode==='generated' && startBtn) startBtn.disabled = !S.quiz.questions?.length;
wireGenerator();
setMode('idle');
}
document.addEventListener('DOMContentLoaded', init);
})();
