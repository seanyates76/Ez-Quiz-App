import { S, STORAGE_KEYS } from './state.js';
import { msToMmSs, mmSsToMs } from './utils.js';

export function saveSettingsToStorage(){
  try{
    localStorage.setItem(STORAGE_KEYS.theme, S.settings.theme);
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({
      timerEnabled: !!S.settings.timerEnabled,
      countdown: !!S.settings.countdown,
      durationMs: Number(S.settings.durationMs||0),
      autoStart: !!S.settings.autoStart,
      requireAnswer: !!S.settings.requireAnswer,
    }));
  }catch{}
}

export function loadSettingsFromStorage(){
  try{ const t=localStorage.getItem(STORAGE_KEYS.theme); if(t==='light'||t==='dark') S.settings.theme=t; }catch{}
  try{ const raw=localStorage.getItem(STORAGE_KEYS.settings); if(raw){ const obj=JSON.parse(raw);
    S.settings.timerEnabled=!!obj.timerEnabled; S.settings.countdown=!!obj.countdown; S.settings.durationMs=Number(obj.durationMs||0);
    if(obj.autoStart!==undefined) S.settings.autoStart=!!obj.autoStart; S.settings.requireAnswer=!!obj.requireAnswer; } }catch{}
}

export function applyTheme(theme){ const t=(theme==='light'||theme==='dark')?theme:'dark'; S.settings.theme=t; document.body.setAttribute('data-theme', t); saveSettingsToStorage(); }

export function reflectSettingsIntoUI(els){
  els.themeRadios.forEach(r=>{ r.checked=(r.value===S.settings.theme); });
  if(els.timerEnabledEl) els.timerEnabledEl.checked=!!S.settings.timerEnabled;
  if(els.countdownModeEl) els.countdownModeEl.checked=!!S.settings.countdown;
  if(els.timerDurationEl) els.timerDurationEl.value=msToMmSs(S.settings.durationMs);
  if(els.autoStartEl) els.autoStartEl.checked=!!S.settings.autoStart;
  if(els.requireAnswerEl) els.requireAnswerEl.checked=!!S.settings.requireAnswer;
}

export function wireSettingsPanel(els){
  els.themeRadios.forEach(radio=>{ radio.addEventListener('change', ()=>{ if(radio.checked) applyTheme(radio.value); }); });
  els.timerEnabledEl?.addEventListener('change', ()=>{ S.settings.timerEnabled=!!els.timerEnabledEl.checked; saveSettingsToStorage(); });
  els.countdownModeEl?.addEventListener('change', ()=>{ S.settings.countdown=!!els.countdownModeEl.checked; saveSettingsToStorage(); });
  els.timerDurationEl?.addEventListener('input', ()=>{ S.settings.durationMs=mmSsToMs(els.timerDurationEl.value); saveSettingsToStorage(); });
  els.autoStartEl?.addEventListener('change', ()=>{ S.settings.autoStart=!!els.autoStartEl.checked; saveSettingsToStorage(); });
  els.requireAnswerEl?.addEventListener('change', ()=>{ S.settings.requireAnswer=!!els.requireAnswerEl.checked; saveSettingsToStorage(); });
}

