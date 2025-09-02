// Elements
const openPrompt = document.getElementById('openPrompt');
const promptPanel = document.getElementById('promptPanel');
const promptForm  = document.getElementById('promptForm');
const genBtn      = document.getElementById('genBtn');
const genStatus   = document.getElementById('genStatus');
const autoStartCb = document.getElementById('autoStart');

const txt         = document.getElementById('quizInput');
const loadTxt     = document.getElementById('loadTxt');
const useDemo     = document.getElementById('useDemo');
const clearTxt    = document.getElementById('clearTxt');
const startBtn    = document.getElementById('startQuiz');

const quizView    = document.getElementById('quizView');

let questions=[], idx=0, score=0;

// —— Legacy toolbar behavior ——
openPrompt.onclick = ()=>{
  promptPanel.hidden = !promptPanel.hidden;
};

loadTxt.onclick = async ()=>{
  const h = await pickFile(); // simple helper below
  if (h) txt.value = h;
};

useDemo.onclick = ()=>{
  txt.value = demoSet(); // stubbed demo text
};

clearTxt.onclick = ()=>{
  txt.value = "";
};

startBtn.onclick = ()=>{
  const lines = txt.value.trim().split(/\r?\n/);
  const parsed = parseLegacy(lines);
  if (!parsed.ok){
    alert("Could not start quiz:\n" + parsed.errors.join("\n"));
    return;
  }
  questions = parsed.questions;
  startQuiz();
};

// —— AI generation panel ——
promptForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const topic = promptForm.topic.value.trim();
  const count = clamp(parseInt(promptForm.count.value,10)||5, 1, 20);
  const difficulty = promptForm.difficulty.value; // for prompt flavor if you want later
  if (!topic){ alert("Enter a topic"); return; }

  setBusy(true, "Generating…");
  try{
    const r = await fetch('/.netlify/functions/generate-quiz',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ topic, questionCount: count })
    });
    const data = await r.json().catch(()=>({error:"Bad response"}));
    if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);

    // New pipeline is JSON → render, but keep legacy textarea visible for familiarity
    // Show JSON as legacy text too (optional), so manual Start works if autoStart is off
    txt.value = jsonToLegacy(data.questions);

    if (autoStartCb.checked){
      questions = data.questions;
      startQuiz();
    } else {
      // Focus Start button to match classic flow
      startBtn.focus();
    }
  }catch(err){
    alert(err.message || "Generation failed.");
  }finally{
    setBusy(false,"");
  }
});

// —— Quiz runner (JSON-based) ——
function startQuiz(){
  idx=0; score=0;
  // Hide editor, show quiz view (classic apps swapped panes)
  document.querySelector('.editor').style.display = 'none';
  promptPanel.hidden = true;
  quizView.hidden = false;
  renderQuestion();
}

function renderQuestion(){
  if (idx >= questions.length){
    quizView.innerHTML = `
      <h2>Quiz Complete</h2>
      <p>Score: ${score}/${questions.length}</p>
      <button id="again">New Quiz</button>`;
    document.getElementById('again').onclick = ()=>location.reload();
    return;
  }
  const q = questions[idx];
  quizView.innerHTML = `
    <h2>Question ${idx+1} of ${questions.length}</h2>
    <p class="q">${esc(q.question)}</p>
    <div class="opts">
      ${q.options.map((o,i)=>`<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}
    </div>`;
  [...quizView.querySelectorAll('.opt')].forEach(b=>{
    b.onclick = ()=>{
      const pick = parseInt(b.dataset.i,10);
      if (pick === q.answerIndex) score++;
      idx++; renderQuestion();
    };
  });
}

// —— Helpers ——
function setBusy(b,msg){ genBtn.disabled=b; genStatus.textContent = msg||""; }
function esc(s){ return String(s).replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

// Convert strict JSON questions → legacy lines (for the textarea & Start button)
function jsonToLegacy(arr){
  return arr.map(q=>{
    const ans = q.answerIndex; // 0..3
    const letters = ["A","B","C","D"];
    return `MC|${q.question}?|A) ${q.options[0]};B) ${q.options[1]};C) ${q.options[2]};D) ${q.options[3]}|${letters[ans]}`;
  }).join("\n");
}

// Parse legacy lines to structured JSON for the quiz runner
function parseLegacy(lines){
  const errors=[], out=[];
  const mcRe = /^MC\|([^\n|]+)\?\|A)\s*([^;]+);B)\s*([^;]+);C)\s*([^;]+);D)\s*([^|]+)\|([ABCD])$/i;
  const tfRe = /^TF\|([^\n|]+)\. \|([TF])$/i;
  const ynRe = /^YN\|([^\n|]+)\?\|([YN])$/i;

  for (let i=0;i<lines.length;i++){
    const s = lines[i].trim();
    if (!s) continue;
    let m;
    if ((m = s.match(mcRe))){
      const q = m[1].trim(), A = m[2].trim(), B = m[3].trim(), C = m[4].trim(), D = m[5].trim(), ans = m[6].toUpperCase();
      const idx = {A:0,B:1,C:2,D:3}[ans];
      out.push({ question:q, options:[A,B,C,D], answerIndex: idx });
    } else if ((m = s.match(tfRe))){
      const q = m[1].trim(), ans = m[2].toUpperCase()==='T' ? 0 : 1;
      out.push({ question:q, options:["True","False"], answerIndex: ans });
    } else if ((m = s.match(ynRe))){
      const q = m[1].trim(), ans = m[2].toUpperCase()==='Y' ? 0 : 1;
      out.push({ question:q, options:["Yes","No"], answerIndex: ans });
    } else {
      errors.push(`Line ${i+1}: invalid format`);
    }
  }
  return errors.length ? { ok:false, errors } : { ok:true, questions: out };
}

// Read a .txt file
async function pickFile(){
  return new Promise((resolve)=>{
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.txt,text/plain';
    inp.onchange = ()=>{
      const f = inp.files[0];
      if (!f) return resolve("");
      const reader = new FileReader();
      reader.onload = ()=>resolve(String(reader.result||""));
      reader.readAsText(f);
    };
    inp.click();
  });
}

// Optional demo
function demoSet(){
  return `MC|What color is the sky?|A) Blue;B) Green;C) Yellow;D) Red|A
TF|Dogs are mammals.|T
YN|Is water wet?|Y`;
}
