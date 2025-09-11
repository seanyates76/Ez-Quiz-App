import { S, STORAGE_KEYS } from './state.js';
import { msToMmSs, mmSsToMs } from './utils.js';

// Cookie helpers for persistent flags (1 year)
const COOKIE_ALWAYSSHOWADV = 'ezq.alwaysShowAdvanced';
function setCookie(name, value){ try{ document.cookie = `${name}=${encodeURIComponent(String(value))}; Max-Age=31536000; Path=/; SameSite=Lax`; }catch{} }
function getCookie(name){ try{ return document.cookie.split(';').map(s=>s.trim()).filter(Boolean).map(s=>s.split('='))
  .reduce((acc,[k,v])=>{ acc[decodeURIComponent(k)] = decodeURIComponent(v||''); return acc; }, {})[name] || ''; }catch{ return ''; } }

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
  // Load cookie-backed flags
  try{ const adv = getCookie(COOKIE_ALWAYSSHOWADV); if(adv){ S.settings.alwaysShowAdvanced = adv === 'true'; } }catch{}
}

export function applyTheme(theme){
  const t=(theme==='light'||theme==='dark')?theme:'dark';
  S.settings.theme=t;
  document.body.setAttribute('data-theme', t);
  // Swap brand logo asset based on theme, with simple, explicit mapping
  try{
    const img = document.querySelector('.brand-logo');
    if(img){
      const darkPng = 'icons/brand-title-source.png'; // intended for dark theme (wide, transparent)
      const lightPng = 'icons/brand-title-source-light.png'; // intended for light theme (square or light variant)
      // Append a small cache-busting token so new assets show after deploy
      const BUST = 'v=brand-20250911r';
      const withBust = (url) => url.includes('?') ? url : `${url}?${BUST}`;

      const pick = t === 'light' ? lightPng : darkPng;
      const fallback = darkPng; // in case light file is missing
      // Set immediately; if it fails, fallback to the other.
      img.onerror = () => { img.onerror = null; img.setAttribute('src', withBust(fallback)); };
      img.setAttribute('src', withBust(pick));
    }
  }catch{}
  saveSettingsToStorage();
}

export function reflectSettingsIntoUI(els){
  els.themeRadios.forEach(r=>{ r.checked=(r.value===S.settings.theme); });
  if(els.timerEnabledEl) els.timerEnabledEl.checked=!!S.settings.timerEnabled;
  if(els.countdownModeEl) els.countdownModeEl.checked=!!S.settings.countdown;
  if(els.timerDurationEl) els.timerDurationEl.value=msToMmSs(S.settings.durationMs);
  if(els.autoStartEl) els.autoStartEl.checked=!!S.settings.autoStart;
  if(els.requireAnswerEl) els.requireAnswerEl.checked=!!S.settings.requireAnswer;
  if(els.alwaysShowAdvancedEl) els.alwaysShowAdvancedEl.checked=!!S.settings.alwaysShowAdvanced;
}

export function wireSettingsPanel(els){
  els.themeRadios.forEach(radio=>{ radio.addEventListener('change', ()=>{ if(radio.checked) applyTheme(radio.value); }); });
  els.timerEnabledEl?.addEventListener('change', ()=>{ S.settings.timerEnabled=!!els.timerEnabledEl.checked; saveSettingsToStorage(); });
  els.countdownModeEl?.addEventListener('change', ()=>{ S.settings.countdown=!!els.countdownModeEl.checked; saveSettingsToStorage(); });
  els.timerDurationEl?.addEventListener('input', ()=>{ S.settings.durationMs=mmSsToMs(els.timerDurationEl.value); saveSettingsToStorage(); });
  els.autoStartEl?.addEventListener('change', ()=>{ S.settings.autoStart=!!els.autoStartEl.checked; saveSettingsToStorage(); });
  els.requireAnswerEl?.addEventListener('change', ()=>{ S.settings.requireAnswer=!!els.requireAnswerEl.checked; saveSettingsToStorage(); });
  els.alwaysShowAdvancedEl?.addEventListener('change', ()=>{ S.settings.alwaysShowAdvanced = !!els.alwaysShowAdvancedEl.checked; try{ setCookie(COOKIE_ALWAYSSHOWADV, String(!!S.settings.alwaysShowAdvanced)); }catch{} });

}

// Expose cookie helpers for other modules
export function getAlwaysShowAdvanced(){ return !!S.settings.alwaysShowAdvanced; }

// Lightweight dynamic import for support module in browser
function requireSupportModule(){ return {}; }
