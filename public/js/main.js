import { S } from './state.js';
import { $, byQSA } from './utils.js';
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

  // Floating actions: hide Support FAB if official widget iframe is present
  (function initFabs(){
    const coffeeFab = document.getElementById('coffeeFab');
    if(!coffeeFab) return;
    const hasWidget = () => !!document.querySelector('iframe[src*="buymeacoffee.com"]');
    const sync = () => { if(hasWidget()){ coffeeFab.style.display='none'; } else { coffeeFab.style.display=''; } };
    // Initial and observe
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { childList:true, subtree:true });
  })();

  setMode('idle');
}

document.addEventListener('DOMContentLoaded', init);
