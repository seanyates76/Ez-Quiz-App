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
    const toggle = document.getElementById('toggleInteractiveEditor');
    const mount = document.getElementById('interactiveEditor');
    const advBlock = document.getElementById('advancedBlock');
    const modeInteractive = document.getElementById('modeInteractive');
    const modeManual = document.getElementById('modeManual');
    // Lazy ensure IE module is initialized when needed
    async function ensureIEReady(){
      if(!mount) return;
      // If the UI already exists, nothing to do
      if(mount.querySelector('#ieGrid') || mount.querySelector('#ieSummary')) return;
      try{
        // Persist enabled state so editor.gui.js reflects it on init
        try{ if(toggle?.checked){ localStorage.setItem('ezq.ie.v2.on', '1'); } }catch{}
        // Dynamically import the module (idempotent) and call init if exposed
        const mod = await import('./editor.gui.js');
        try{ mod?.default?.init?.(); }catch{}
      }catch{}
    }
    function setEditorMode(mode){
      const interactive = mode === 'interactive';
      // Reflect mode on container for CSS control
      if(advBlock){ advBlock.setAttribute('data-mode', interactive ? 'interactive':'manual'); }
      // Sync legacy toggle used by IE module
      if(toggle){ toggle.checked = interactive; toggle.dispatchEvent(new Event('change', { bubbles:true })); }
      // Persist IE enabled state for module boot
      try{ localStorage.setItem('ezq.ie.v2.on', interactive?'1':'0'); }catch{}
      // Ensure UI exists when switching to interactive
      if(interactive){ ensureIEReady(); }
    }

    if(toggle && mount){
      // Initialize from selected radio, default interactive
      if(modeInteractive?.checked){ setEditorMode('interactive'); }
      else if(modeManual?.checked){ setEditorMode('manual'); }
      else { setEditorMode(toggle.checked ? 'interactive':'manual'); }
      modeInteractive?.addEventListener('change', ()=>{ if(modeInteractive.checked) setEditorMode('interactive'); });
      modeManual?.addEventListener('change', ()=>{ if(modeManual.checked) setEditorMode('manual'); });
    }
  }catch{}
});

export { announce, lockApp, unlockApp };
