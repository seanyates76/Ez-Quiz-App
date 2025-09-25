export const $ = (id) => document.getElementById(id);
export const byQSA = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
export function pad2(n){ return String(n).padStart(2,'0'); }
export function formatDuration(ms){ if(!ms || ms < 0) ms = 0; const total = Math.floor(ms/1000); const mm = Math.floor(total/60); const ss = total % 60; return `${pad2(mm)}:${pad2(ss)}`; }
export function arraysEqual(a,b){ if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length) return false; for(let i=0;i<a.length;i++){ if(a[i]!==b[i]) return false; } return true; }
export function escapeHTML(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll('&#39;','&#39;'); }
export function normalizeLettersToIndexes(letterStr){ if(!letterStr) return []; return letterStr.split(',').map(s=>s.trim()).filter(Boolean).map(ch => ch.toUpperCase().charCodeAt(0) - 65).filter(n => n >= 0); }
export function indexesToLetters(idxs){ return (idxs||[]).map(i => String.fromCharCode(65 + i)); }
export function msToMmSs(ms){ if(!ms || ms<=0) return ''; const mm = Math.floor(ms/60000), ss = Math.floor((ms%60000)/1000); return `${pad2(mm)}:${pad2(ss)}`; }
export function mmSsToMs(txt){ const s=(txt||'').trim(); if(!s) return 0; const parts=s.split(':'); if(parts.length===2){ const mm=parseInt(parts[0],10)||0; const ss=parseInt(parts[1],10)||0; return (mm*60+ss)*1000; } const mm=parseInt(s,10)||0; return mm*60*1000; }
export function formatTopicLabel(raw){ if(!raw) return ''; const base = String(raw).replace(/\.[a-zA-Z0-9]{1,5}$/,''); const parts = base.trim().split(/\s+/); return parts.map(w=> w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' '); }

// UI helpers
export function showUpdateBannerIfReady(){
  try{
    const flag = localStorage.getItem('ezq.update.ready');
    if(flag === '1'){
      const banner = document.getElementById('updateBanner');
      if(banner){
        banner.classList.remove('hidden');
        banner.hidden = false;
      }
    }
  }catch{}
}

// Event helper: bind once per element/property name
export function bindOnce(el, type, handler, flagName){
  if(!el) return;
  const key = flagName || (`__bound_${type}`);
  if(el[key]) return;
  el.addEventListener(type, handler);
  el[key] = true;
}
