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
  loadSettingsFromStorage();
  applyTheme(S.settings.theme);
  const els = getEls();
  reflectSettingsIntoUI(els);
  wireSettingsPanel(els);
  wireModals({ onPause: pauseTimerIfQuiz, onResume: resumeTimerIfQuiz });
  wireGenerator({ beginQuiz, syncSettingsFromUI });
  wireQuizControls();
  wireResultsControls();

  // Register service worker (CSP-safe)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
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

    const COOLDOWN_MS = 30000;
    const LS_KEY_LAST = 'ezq.fb.last';
    function getLastTs(){ try{ return parseInt(localStorage.getItem(LS_KEY_LAST)||'0',10)||0; }catch{ return 0; } }
    function setLastTs(t){ try{ localStorage.setItem(LS_KEY_LAST, String(t)); }catch{} }

    function setOpen(open){ if(!panel) return; panel.classList.toggle('hidden', !open); if(open){ msg?.focus(); } }
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
