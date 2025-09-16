import { S } from './state.js';
import { $, byQSA, showUpdateBannerIfReady } from './utils.js';
import { loadSettingsFromStorage, applyTheme, reflectSettingsIntoUI, wireSettingsPanel } from './settings.js';
import { wireModals } from './modals.js';
import { wireGenerator } from './generator.js';
import { setMode, beginQuiz, renderCurrentQuestion, updateNavButtons, updateProgress, wireQuizControls, wireResultsControls, pauseTimerIfQuiz, resumeTimerIfQuiz, syncSettingsFromUI } from './quiz.js';

function getEls(){
  return {
    themeRadios: byQSA('input[name="theme"]'),
    timerEnabledEl: $('timerEnabled'),
    countdownModeEl: $('countdownMode'),
    timerDurationEl: $('timerDuration'),
    autoStartEl: $('autoStart'),
    requireAnswerEl: $('requireAnswer'),
    alwaysShowAdvancedEl: $('alwaysShowAdvanced'),
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
}

document.addEventListener('DOMContentLoaded', init);
