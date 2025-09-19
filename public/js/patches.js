// Lightweight, non-invasive patches layered on top of existing modules.
// Guards against missing elements; safe to load after main.js.

function qs(id){ return document.getElementById(id); }

function setMirrorEmptyFlag(){
  const mirror = qs('mirror');
  const box = qs('mirrorBox');
  const empty = !mirror || !(mirror.value||'').trim();
  if(mirror){ mirror.setAttribute('data-empty', empty ? 'true':'false'); }
  if(box){ box.setAttribute('data-empty', empty ? 'true':'false'); }
}

function announce(msg, ms=1600){
  const t = qs('toast'); if(!t) return;
  t.textContent = String(msg||''); t.hidden = false;
  window.clearTimeout(announce._to); announce._to = window.setTimeout(()=>{ t.hidden = true; }, ms);
}

function lockApp(){ document.body.setAttribute('data-locked','true'); }
function unlockApp(){ document.body.removeAttribute('data-locked'); }

function wireLockGuards(){
  // Disable generator inputs while locked
  function apply(){
    const locked = document.body.getAttribute('data-locked') === 'true';
    const toolbar = document.querySelector('.gen-toolbar');
    if(!toolbar) return;
    const controls = toolbar.querySelectorAll('button, input, select');
    controls.forEach(el=>{
      // Keep Generate usable even while a quiz is active
      if(el.id==='generateBtn' || el.id==='optionsBtn') return;
      el.disabled = !!locked;
    });
  }
  const mo = new MutationObserver(apply); mo.observe(document.body, { attributes:true, attributeFilter:['data-locked'] });
  apply();
}

function wireStartHint(){
  const start = qs('startBtn'); if(!start) return;
  let hinted = false;
  const obs = new MutationObserver(()=>{
    if(!hinted && !start.disabled){ hinted = true; announce('Ready — press Start to begin'); }
  });
  obs.observe(start, { attributes:true, attributeFilter:['disabled'] });
}

function wireMirror(){
  const mirror = qs('mirror'); const editor = qs('editor');
  mirror?.addEventListener('input', setMirrorEmptyFlag);
  editor?.addEventListener('input', ()=>{ /* if mirror mirrors editor, keep empty flag in sync */ setMirrorEmptyFlag(); });
  // Initial
  setMirrorEmptyFlag();
}

function wireQuizLocks(){
  const quiz = qs('quizView'); const gen = qs('generatorCard'); const res = qs('resultsView');
  if(!quiz) return;
  const apply = ()=>{
    const inQuiz = !quiz.classList.contains('is-hidden');
    if(inQuiz) lockApp(); else unlockApp();
  };
  const mo = new MutationObserver(apply);
  mo.observe(quiz, { attributes:true, attributeFilter:['class'] });
  apply();
}

function wireBrandSwap(){
  try{
    const img = document.querySelector('#brandTitle.brand-logo') || document.querySelector('.brand-logo');
    if(!img) return;
    const darkSrc = img.getAttribute('data-dark');
    const lightSrc = img.getAttribute('data-light');
    if(!darkSrc || !lightSrc) return; // settings.js will handle default swap
    const set = (theme)=>{ const pick = theme==='light' ? lightSrc : darkSrc; if(img.getAttribute('src')!==pick){ img.setAttribute('src', pick); } };
    const current = document.body.getAttribute('data-theme') || 'dark'; set(current);
    const ro = new MutationObserver(()=> set(document.body.getAttribute('data-theme')||'dark'));
    ro.observe(document.body, { attributes:true, attributeFilter:['data-theme'] });
  }catch{}
}

document.addEventListener('DOMContentLoaded', ()=>{
  wireMirror();
  wireStartHint();
  wireLockGuards();
  wireQuizLocks();
  wireBrandSwap();
  // IE fallback: ensure the IE toggle at least shows/hides the mount
  try{
    const toggle = document.getElementById('toggleInteractiveEditor') || document.querySelector('[data-role="quiz-editor-toggle"]');
    const mount = document.getElementById('interactiveEditor');
    if(toggle && mount){
      const apply = ()=>{ mount.classList.toggle('hidden', !toggle.checked); };
      toggle.addEventListener('change', apply);
      // If the toggle is already checked (e.g., restored state), reflect it
      apply();
    }
  }catch{}
});

export { announce, lockApp, unlockApp };
