import { S } from './state.js';
import { $, byQSA, showUpdateBannerIfReady } from './utils.js';
import { loadSettingsFromStorage, applyTheme, reflectSettingsIntoUI, wireSettingsPanel } from './settings.js';
import { wireModals } from './modals.js';
import { wireGenerator } from './generator.js?v=1.5.14';
import { setMode, beginQuiz, renderCurrentQuestion, updateNavButtons, updateProgress, wireQuizControls, wireResultsControls, pauseTimerIfQuiz, resumeTimerIfQuiz, syncSettingsFromUI } from './quiz.js';

function getEls(){
  return {
    themeRadios: byQSA('input[name="theme"]'),
    timerEnabledEl: $('timerEnabled'),
    countdownModeEl: $('countdownMode'),
    timerDurationEl: $('timerDuration'),
    autoStartEl: $('autoStart'),
    requireAnswerEl: $('requireAnswer'),
    quizEditorPrefEl: $('alwaysShowQuizEditor'),
    betaEnabledEl: $('betaEnabled'),
  };
}

function init(){
  // Measure header height for light theme brand placement
  (function headerMetrics(){
    function updateHeaderVars(){
      try{
        const header = document.querySelector('.site-header');
        const h = header ? header.offsetHeight : 0;
        if(h){ document.documentElement.style.setProperty('--header-h', h + 'px'); }
      }catch{}
    }
    updateHeaderVars();
    window.addEventListener('resize', updateHeaderVars);
  })();
  loadSettingsFromStorage();
  
  // Check for beta auto-redirect
  if (S.settings.betaEnabled && window.location.pathname === '/' && !window.location.search.includes('no-beta-redirect')) {
    window.location.href = '/beta';
    return;
  }
  
  applyTheme(S.settings.theme);
  const els = getEls();
  reflectSettingsIntoUI(els);
  wireSettingsPanel(els);
  wireModals({ onPause: pauseTimerIfQuiz, onResume: resumeTimerIfQuiz });
  wireGenerator({ beginQuiz, syncSettingsFromUI });
  wireQuizControls();
  wireResultsControls();

  // Register service worker with gentle update signaling
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        try { reg.update(); } catch {}
        // If there's a waiting worker, ask it to activate
        if (reg.waiting) { try { reg.waiting.postMessage('SKIP_WAITING'); } catch {} }
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              try { localStorage.setItem('ezq.update.ready', '1'); } catch {}
            }
          });
        });
      }).catch(() => {});
    });
  }

  // Emergency: hard-reset caches + service workers when needed
  async function hardReset() {
    try { localStorage.clear(); } catch {}
    try {
      // Best-effort: ask SWs to clear caches in their context
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          try { r.active && r.active.postMessage('CLEAR_CACHES'); } catch {}
        }
      }
    } catch {}
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {}
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister().catch(() => {})));
      }
    } catch {}
    // Small delay to ensure unregister settles before reload
    setTimeout(() => { try { window.location.reload(true); } catch { window.location.reload(); } }, 200);
  }

  // Wire Reset App button (Settings → Quiz Editor)
  (function wireHardReset(){
    const btn = document.getElementById('resetApp');
    btn?.addEventListener('click', () => {
      const ok = window.confirm('Reset app data and refresh? This clears caches, service workers, and local data.');
      if (ok) hardReset();
    });
    // URL triggers for stuck mobile clients
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('clear') === '1' || location.hash === '#clear-cache') hardReset();
    } catch {}
  })();

  // Floating actions: fixed position, always visible
  (function initFabs(){
    const container = document.getElementById('floatingActions');
    if(container) container.style.bottom = '1rem';

    const btn = document.getElementById('feedbackFab');
    const panel = document.getElementById('feedbackPanel');
    const msg = document.getElementById('feedbackMessage');
    const email = document.getElementById('feedbackEmail');
    const count = document.getElementById('feedbackCount');
    const send = document.getElementById('feedbackSend');
    const cancel = document.getElementById('feedbackCancel');
    const status = document.getElementById('feedbackStatus');
    const trap = document.getElementById('feedbackTrap');

    function updateFabReserve(){
      try{
        const root = document.documentElement;
        const fab = document.getElementById('floatingActions');
        const panelEl = document.getElementById('feedbackPanel');
        let reserve = 0;
        if(fab){ reserve = Math.max(reserve, fab.offsetHeight + 24); }
        if(panelEl && !panelEl.classList.contains('hidden')){ reserve = Math.max(reserve, panelEl.offsetHeight + 24); }
        reserve = Math.max(96, reserve);
        root.style.setProperty('--fab-reserve', reserve + 'px');
        // Horizontal padding so footer text doesn't sit under FABs
        let rightPad = 0;
        if(fab){ rightPad = Math.max(rightPad, fab.getBoundingClientRect().width + 16); }
        root.style.setProperty('--fab-right-pad', Math.round(rightPad) + 'px');
      }catch{}
    }

    const COOLDOWN_MS = 30000;
    const LS_KEY_LAST = 'ezq.fb.last';
    function getLastTs(){ try{ return parseInt(localStorage.getItem(LS_KEY_LAST)||'0',10)||0; }catch{ return 0; } }
    function setLastTs(t){ try{ localStorage.setItem(LS_KEY_LAST, String(t)); }catch{} }

    function setOpen(open){ if(!panel) return; panel.classList.toggle('hidden', !open); updateFabReserve(); if(open){ msg?.focus(); } }
    function updateCount(){ if(!msg||!count) return; const n=(msg.value||'').length; count.textContent = `${n}/500`; }
    btn?.addEventListener('click', (e)=>{ e.preventDefault(); setOpen(!panel || panel.classList.contains('hidden')); });
    cancel?.addEventListener('click', ()=> setOpen(false));
    msg?.addEventListener('input', updateCount);
    updateCount();
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && panel && !panel.classList.contains('hidden')){ e.stopPropagation(); setOpen(false); } });

    // Basic focus trap when panel is open
    const focusables = () => panel?.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])') || [];
    function trapFocus(e){
      if(!panel || panel.classList.contains('hidden')) return;
      if(e.key !== 'Tab') return;
      const els = Array.from(focusables()); if(!els.length) return;
      const first = els[0], last = els[els.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', trapFocus);
    window.addEventListener('resize', updateFabReserve);

    async function sendFeedback(){
      if(!msg) return; const text=(msg.value||'').trim(); const em=(email?.value||'').trim();
      if(!text){ if(status) status.textContent='Message required'; return; }
      const last = getLastTs(); const now=Date.now();
      if(now - last < COOLDOWN_MS){
        const remain = Math.ceil((COOLDOWN_MS - (now-last))/1000);
        if(status) status.textContent = `Please wait ${remain}s before sending again.`;
        return;
      }
      if(status) status.textContent='Sending…'; send && (send.disabled=true);
      try{
        const res = await fetch('/.netlify/functions/send-feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message:text, email:em, hp:(trap?.value||'') }) });
        const data = await res.json().catch(()=>({}));
        if(res.ok && data && data.success){ if(status) status.textContent='Feedback sent — thank you!'; setLastTs(now); msg.value=''; updateCount(); setTimeout(()=>{ setOpen(false); if(status) status.textContent=''; }, 1400); }
        else { if(status) status.innerHTML='Error sending feedback. Please try again later. <a href="mailto:ez.quizapp@gmail.com">Email us</a>.'; }
      }catch{ if(status) status.textContent='Network error. Please try again.'; }
      finally{ if(send) send.disabled=false; }
    }
    send?.addEventListener('click', sendFeedback);
    // Initial measurement
    updateFabReserve();
  })();

  // Update banner wiring
  (function initUpdateBanner(){
    const btn = document.getElementById('updateRefreshBtn');
    btn?.addEventListener('click', ()=>{ try{ localStorage.removeItem('ezq.update.ready'); }catch{} window.location.reload(true); });
    // Show on load if we happen to be idle
    showUpdateBannerIfReady();
  })();

  setMode('idle');

  // History/back handling for mobile PWAs and Android back button
  (function wireHistory(){
    try{ history.replaceState({ view: S.mode||'idle' }, '', location.pathname + location.search); }catch{}
    function closeAnyOpenModal(){
      const open = document.querySelector('.modal.is-open');
      if(open){ try{ open.classList.remove('is-open'); open.setAttribute('aria-hidden','true'); }catch{} return true; }
      return false;
    }
    function feedbackOpen(){ const p = document.getElementById('feedbackPanel'); return p && !p.classList.contains('hidden'); }
    function closeFeedback(){ const p = document.getElementById('feedbackPanel'); if(p && !p.classList.contains('hidden')){ p.classList.add('hidden'); return true; } return false; }
    function optionsOpen(){ const op = document.getElementById('optionsPanel'); return !!(op && !op.hidden); }
    function closeOptions(){ const op = document.getElementById('optionsPanel'); const btn=document.getElementById('optionsBtn'); if(op && !op.hidden){ op.hidden=true; btn?.setAttribute('aria-expanded','false'); return true; } return false; }

    window.addEventListener('popstate', (e)=>{
      // 1) Close modal if open
      if(closeAnyOpenModal()){ try{ history.pushState({view:S.mode}, '', location.href); }catch{} return; }
      // 2) Close feedback panel if open
      if(closeFeedback()){ try{ history.pushState({view:S.mode}, '', location.href); }catch{} return; }
      // 3) Close options panel if open
      if(closeOptions()){ try{ history.pushState({view:S.mode}, '', location.href); }catch{} return; }
      // 4) Handle in-app navigation
      if(S.mode==='quiz'){
        if(S.quiz.index>0){ S.quiz.index -= 1; renderCurrentQuestion(); updateNavButtons(); try{ history.pushState({view:'quiz'}, '', location.href); }catch{} return; }
        // At first question: simple confirm before leaving
        const ok = window.confirm('Leave quiz and return to menu? Your progress will be lost.');
        if(!ok){ try{ history.pushState({view:'quiz'}, '', location.href); }catch{} return; }
        try{ pauseTimerIfQuiz(); }catch{}
        setMode('idle'); try{ history.pushState({view:'idle'}, '', location.href); }catch{} return;
      }
      if(S.mode==='results'){
        // Back from results returns to main menu
        setMode('idle'); try{ history.pushState({view:'idle'}, '', location.href); }catch{} return;
      }
      // Otherwise, let the browser proceed
    });
  })();
}

document.addEventListener('DOMContentLoaded', init);
