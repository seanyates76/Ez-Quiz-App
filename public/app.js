/* EZ-Quiz: generator-first app.js (delayed start) */
(function () {
  // ---------- Utils ----------
  function escapeHTML(s){
    return String(s).replace(/[&<>\""]/g, m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;"
    }[m]));
  }
  function clamp(n,a,b){ n = Number(n)||0; return Math.max(a, Math.min(b, n)); }

  function ensureReadyPanel(){
    let panel = document.getElementById('readyPanel');
    if (panel) return panel;
    const hero = document.querySelector('.hero');
    if (!hero) return null;
    const div = document.createElement('div');
    div.id = 'readyPanel';
    div.className = 'ready';
    div.hidden = true;
    div.innerHTML = `
      <div class="ready-text">✅ Quiz generated. Review options or press Start to begin.</div>
      <div class="ready-actions">
        <button id="startNow" class="btn primary">Start</button>
        <button id="openEditorFromReady" class="btn">Open in Editor</button>
      </div>`;
    hero.appendChild(div);
    return div;
  }

  // ---------- Backend call ----------
  async function callAI(topic, questionCount, difficulty){
  const r = await fetch('/.netlify/functions/generate-quiz',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ topic, questionCount, difficulty })
  });
  let payload = null;
  try { payload = await r.clone().json(); } catch { /* fall through */ }
  if (!r.ok){
    let bodyText = '';
    try { bodyText = await r.text(); } catch {}
    const msg = (payload && payload.error) || bodyText || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  if (!payload || !Array.isArray(payload.questions)) throw new Error('Malformed response');
  return payload.questions;
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

  function setProgress(idx, total){
    const bar = document.getElementById('quizProgress');
    if (!bar) return;
    const pct = total ? Math.round((idx/total)*100) : 0;
    bar.style.width = pct + '%';
  }
  function fadeSwap(el, html){
    el.style.opacity = '0';
    setTimeout(()=>{ el.innerHTML = html; el.style.opacity = '1'; }, 100);
  }

  function renderQuestionJSON(){
    const quizEl = document.getElementById('quizView');
    const state = window.__quiz;
    if (!quizEl || !state) return;

    const { questions, idx, score } = state;
    if (idx >= questions.length){
      fadeSwap(quizEl, [
        '<div class="progress"><span id="quizProgress" style="width:100%"></span></div>',
        '<h2>Quiz Complete</h2>',
        `<p>Score: ${score}/${questions.length}</p>`,
        '<div class="quiz-footer">',
        '<button id="again" class="btn primary">New Quiz</button>',
        '</div>'
      ].join(''));
      setTimeout(()=>{ 
        const a = document.getElementById('again');
        if (a) a.onclick = () => location.href = location.pathname;
      }, 0);
      return;
    }

    const q = questions[idx];
    const opts = Array.isArray(q.options) ? q.options.slice(0,4) : [];
    while (opts.length < 4) opts.push(`Option ${opts.length+1}`);

    const html = [
      '<div class="progress"><span id="quizProgress"></span></div>',
      `<h2>Question ${idx+1} of ${questions.length}</h2>`,
      `<p class="q">${escapeHTML(q.question||'')}</p>`,
      '<div class="opts">',
      ...opts.map((o,i)=>`<button class="opt" data-i="${i}">${escapeHTML(o||'')}</button>`),
      '</div>'
    ].join('');
    fadeSwap(quizEl, html);
    setTimeout(()=>{ 
      setProgress(idx, questions.length);
      const buttons = quizEl.querySelectorAll('.opt');
      buttons.forEach(b => {
        b.onclick = () => {
          const pick = parseInt(b.dataset.i,10);
          if (pick === (q.answerIndex|0)) state.score++;
          state.idx++; renderQuestionJSON();
        };
      });
    }, 0);
  }

  // ---------- Veil loader with quirky messages ----------
  const MESSAGES = [
    'Sharpening pencils…',
    'Arguing about the correct answer… politely.',
    'Counting to four. Repeatedly.',
    'Shuffling options without dropping any.',
    'Checking for trick questions…',
    'Teaching the quiz to behave.',
    'Wrangling multiple choices…',
  ];
  let veilTimer = null;
  function showVeil(startAt=0){
    const veil = document.getElementById('veil');
    const msg  = document.getElementById('veilMsg');
    if (!veil || !msg) return;
    let i = startAt % MESSAGES.length;
    msg.textContent = MESSAGES[i++];
    veil.hidden = false;
    veilTimer = setInterval(()=>{ msg.textContent = MESSAGES[i++ % MESSAGES.length]; }, 7200);
  }
  function hideVeil(doneText){
    const veil = document.getElementById('veil');
    const msg  = document.getElementById('veilMsg');
    if (veilTimer) { clearInterval(veilTimer); veilTimer = null; }
    if (msg) msg.textContent = doneText;
    setTimeout(()=>{ if (veil) veil.hidden = true; }, 250);
  }

  // ---------- Quick form (Generate → ready panel, no auto-start) ----------
  (function wireQuickForm(){
    const form   = document.getElementById('quickForm');
    const topic  = document.getElementById('quickTopic');
    const count  = document.getElementById('quickCount');
    const diff   = document.getElementById('quickDifficulty');
    const btn    = document.getElementById('quickBtn');
    const st     = document.getElementById('quickStatus');

    // Ensure the ready panel exists (creates it if missing)
    const panel  = ensureReadyPanel();
    const ready  = document.getElementById('readyPanel');
    const start  = document.getElementById('startNow');
    const openEd = document.getElementById('openEditorFromReady');

    if (!form || !topic || !count || !diff || !btn || !st) return;

    let pending = null; // holds generated questions until user presses Start

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const t = (topic.value||'').trim();
      const n = clamp(count.value, 1, 20);
      const d = String(diff.value||'medium').toLowerCase();
      if (!t){ alert('Enter a topic'); return; }

      btn.disabled = true; st.textContent = 'Generating…';
      showVeil(Math.floor(Math.random()*7));
      try{
        const qs = await callAI(t, n, d);
        pending = qs;
        hideVeil('Quiz ready!');
        st.textContent = '';
        if (ready) ready.hidden = false;   // show “Quiz generated, press Start…”
      }catch(err){
        hideVeil();
        alert(err && err.message || 'Generation failed');
        st.textContent = err && err.message || 'Generation failed';
      }finally{
        btn.disabled = false; if (st.textContent === 'Generating…') st.textContent = '';
      }
    });

    if (start) start.addEventListener('click', ()=>{
      if (!pending || !Array.isArray(pending) || pending.length === 0){
        alert('No quiz ready. Generate first.'); return;
      }
      if (ready) ready.hidden = true;
      startQuizWithQuestions(pending);
      const m = document.getElementById('manualMenu'); if (m) m.removeAttribute('open');
    });

    if (openEd) openEd.addEventListener('click', ()=>{
      const editor = document.getElementById('editorPane');
      if (editor) editor.hidden = false;
      if (pending && Array.isArray(pending)) {
        const ta = document.getElementById('quizInput');
        if (ta) {
          ta.value = pending.map(q=>{
            const opt = i => String(q.options?.[i] ?? '').trim() || `Option ${i+1}`;
            const ans = (q.answerIndex|0);
            return `MC|${q.question}|A) ${opt(0)};B) ${opt(1)};C) ${opt(2)};D) ${opt(3)}|${'ABCD'[ans]||'A'}`;
          }).join('\n');
        }
      }
      const m = document.getElementById('manualMenu'); if (m) m.removeAttribute('open');
    });
  })();;

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
    proxy('menuHelp','faqBtn'); // change if your Help button uses a different id
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

  // ---------- Brand click → back to clean start ----------
  (function brandHome(){
    const titleEl = document.querySelector('.brand-img');
    if (!titleEl) return;
    titleEl.style.cursor = 'pointer';
    titleEl.title = 'Back to start';
    titleEl.addEventListener('click', ()=> location.href = location.pathname);
  })();

})();
