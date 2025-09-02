const form = document.getElementById('quizForm');
const quizEl = document.getElementById('quiz');
const statusEl = document.getElementById('status');

let questions = [], idx = 0, score = 0;

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const topic = form.topic.value.trim();
  const count = Math.max(1, Math.min(20, parseInt(form.count.value,10)||5));
  if (!topic) return alert("Please enter a topic.");

  setBusy(true, "Generating…");
  try {
    const r = await fetch('/.netlify/functions/generate-quiz', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ topic, questionCount: count })
    });
    const data = await r.json().catch(()=>({ error:"Bad response" }));
    if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);

    questions = data.questions;
    idx = 0;
    score = 0;
    form.hidden = true;
    quizEl.hidden = false;
    renderQuestion();
  } catch (err) {
    alert(err.message || "Generation failed.");
  } finally {
    setBusy(false, "");
  }
});

function renderQuestion(){
  if (idx >= questions.length) {
    quizEl.innerHTML = `
      <h2>Quiz complete</h2>
      <p>Score: ${score}/${questions.length}</p>
      <button id="again">New Quiz</button>`;
    document.getElementById('again').onclick = ()=>{
      location.reload();
    };
    return;
  }
  const q = questions[idx];
  quizEl.innerHTML = `
    <h2>Question ${idx+1} of ${questions.length}</h2>
    <p class="q">${escapeHTML(q.question)}</p>
    <div class="opts">
      ${q.options.map((opt,i)=>`<button class="opt" data-i="${i}">${escapeHTML(opt)}</button>`).join('')}
    </div>`;
  [...quizEl.querySelectorAll('.opt')].forEach(btn=>{
    btn.onclick = ()=>{
      const chosen = parseInt(btn.dataset.i,10);
      if (chosen === q.answerIndex) score++;
      idx++;
      renderQuestion();
    };
  });
}

function setBusy(b, msg){
  document.getElementById('genBtn').disabled = b;
  statusEl.textContent = msg || "";
}

function escapeHTML(s){ return String(s).replace(/[&<"'']/g, m=>({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":