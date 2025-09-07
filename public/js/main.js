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

  setMode('idle');
}

document.addEventListener('DOMContentLoaded', init);
