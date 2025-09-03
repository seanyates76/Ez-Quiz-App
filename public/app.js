/* EZ-Quiz: generator-first app.js (compact build) */
(function () {
  // ---------- Utils ----------
  function escapeHTML(s){
    return String(s).replace(/[&<>\"]/g, m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;"
    }[m]));
  }
  function clamp(n,a,b){ n = Number(n)||0; return Math.max(a, Math.min(b, n)); }

  // ---------- Backend call ----------
  async function callAI(topic, questionCount, difficulty){
    const r = await fetch('/.netlify/functions/generate-quiz',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ topic, questionCount, difficulty })
    });
    const data = await r.json().catch(()=>({error:'Bad response'}));
    if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
    if (!Array.isArray(data.questions)) throw new Error('Malformed response');
    return data.questions; // [{question, options[4], answerIndex}]
  }

  // ---------- JSON quiz runner ----------
  function startQuizWithQuestions(questions){
    const editor = document.getElementById('editorPane');
    if (editor) editor.hidden = true;
    const quizEl = document.getElementById('quizView');
    if (quizEl) quizEl.hidden = false;
    window.__quiz = { questions, idx:0, score:0 };
    renderQuestionJSON();
  }

  function renderQuestionJSON(){
    const quizEl = document.getElementById('quizView');
    const state = window.__quiz;
    if (!quizEl || !state) return;

    const { questions, idx, score } = state;
    if (idx >= questions.length){
      quizEl.innerHTML = `
        <h2>Quiz Complete</h2>
        <p>Score: ${score}/${questions.length}</p>
        <button id="again">New Quiz</button>`;
      const again = document.getElementById('again');
      if (again) again.onclick = () => location.reload();
      return;
    }
    const q = questions[idx];
    quizEl.innerHTML = `
      <h2>Question ${idx+1} of ${questions.length}</h2>
      <p class="q">${escapeHTML(q.question||'')}</p>
      <div class="opts">
        ${Array.isArray(q.options) ? q.options.slice(0,4).map((o,i)=>`<button class="opt" data-i="${i}">${escapeHTML(o||'')}</button>`).join('') : ''}
      </div>`;
    const buttons = quizEl.querySelectorAll('.opt');
    buttons.forEach(b => {
      b.onclick = () => {
        const pick = parseInt(b.dataset.i,10);
        if (pick === (q.answerIndex|0)) state.score++;
        state.idx++; renderQuestionJSON();
      };
    });
  }

  // ---------- Quick form (primary path) ----------
  (function wireQuickForm(){
    const form  = document.getElementById('quickForm');
    const topic = document.getElementById('quickTopic');
    const count = document.getElementById('quickCount');
    const diff  = document.getElementById('quickDifficulty');
    const btn   = document.getElementById('quickBtn');
    const st    = document.getElementById('quickStatus');
    if (!form || !topic || !count || !diff || !btn || !st) return;

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const t = (topic.value||'').trim();
      const n = clamp(count.value, 1, 20);
      const d = String(diff.value||'medium').toLowerCase();
      if (!t){ alert('Enter a topic'); return; }

      btn.disabled = true; st.textContent = 'Generating…';
      try{
        const qs = await callAI(t, n, d);
        startQuizWithQuestions(qs);
        const m = document.getElementById('manualMenu'); if (m) m.removeAttribute('open');
      }catch(err){
        alert(err && err.message || 'Generation failed');
        st.textContent = err && err.message || 'Generation failed';
      }finally{
        btn.disabled = false; if (st.textContent === 'Generating…') st.textContent = '';
      }
    });
  })();

  // ---------- Manual ▾ proxies ----------
  (function wireManualMenu(){
    const byId = id => document.getElementById(id);
    const proxy = (src, dst) => { const a=byId(src), b=byId(dst); if (a && b) a.onclick = () => b.click(); };

    const editor = byId('editorPane');
    const openEditor = byId('openEditor');
    if (openEditor && editor) openEditor.onclick = () => {
      editor.hidden = false; const m = byId('manualMenu'); if (m) m.removeAttribute('open');
      const qa = byId('quizInput'); if (qa) qa.focus();
    };

    // Map dropdown items to your existing legacy buttons (if present on page)
    proxy('menuLoadTxt','loadTxt');
    proxy('menuUseDemo','useDemo');
    proxy('menuClearTxt','clearTxt');
    proxy('menuStartQuiz','startQuiz');
    proxy('menuHelp','faqBtn'); // change to your actual help button id if it differs
  })();

  // ---------- Prefill-only from URL (no auto-run) ----------
  (function prefillFromURL(){
    try{
      const url = new URL(location.href);
      const t = url.searchParams.get('topic') || "";
      const n = url.searchParams.get('count') || "";
      const d = url.searchParams.get('difficulty') || "";
      if (t) { const el=document.getElementById('quickTopic'); if (el) el.value=t; }
      if (n) { const el=document.getElementById('quickCount'); if (el) el.value=n; }
      if (d) { const el=document.getElementById('quickDifficulty'); if (el) el.value=d.toLowerCase(); }
    }catch{}
  })();

})();