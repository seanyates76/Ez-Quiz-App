import { $ } from './utils.js';

const KEY = 'ezq.support';
const WIDGET_SRC = 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js';
const BMC_ID = 'seanyates78';

function loadState(){
  try{ const raw=localStorage.getItem(KEY); if(raw){ const o=JSON.parse(raw); return { completed: Number(o.completed||0), clicked: !!o.clicked }; } }catch{} return { completed: 0, clicked: false };
}
function saveState(s){ try{ localStorage.setItem(KEY, JSON.stringify({ completed: Number(s.completed||0), clicked: !!s.clicked })); }catch{} }

export function resetSupportPrompts(){ const s={ completed:0, clicked:false }; saveState(s); hideBmcBanner(); }
export function markSupportClicked(){ const s=loadState(); s.clicked=true; saveState(s); hideBmcBanner(); }

function getWidgetScript(){ return document.querySelector(`script[src="${WIDGET_SRC}"]`); }
function getWidgetIframe(){ return document.querySelector('iframe[src*="buymeacoffee.com"]'); }

function ensureWidgetScript(){
  if(getWidgetScript()) return;
  const s=document.createElement('script');
  s.src=WIDGET_SRC; s.async=true; s.setAttribute('data-name','BMC-Widget'); s.setAttribute('data-cfasync','false');
  s.setAttribute('data-id', BMC_ID);
  s.setAttribute('data-description','Support me on Buy me a coffee!');
  s.setAttribute('data-message','Want to support the developer? Buy me a coffee here! :)');
  s.setAttribute('data-color','#5F7FFF');
  s.setAttribute('data-position','Right');
  s.setAttribute('data-x_margin','18');
  s.setAttribute('data-y_margin','18');
  document.body.appendChild(s);
}

export function showBmcBanner(){
  ensureWidgetScript();
  // ESC to close the widget for this instance
  function onKey(e){ if(e.key==='Escape'){ hideBmcBanner(); document.removeEventListener('keydown', onKey); const btn=$('supportBtn'); if(btn) try{btn.focus();}catch{} }
  }
  document.addEventListener('keydown', onKey);
}

export function hideBmcBanner(){
  const ifr = getWidgetIframe(); if(ifr && ifr.parentElement){ try{ ifr.parentElement.remove(); }catch{} }
}

export function maybeShowBmcAfterCompletion(){
  const s = loadState(); if(s.clicked) return; s.completed = Number(s.completed||0) + 1; saveState(s);
  const n=s.completed; if(n===1 || (n>0 && n%4===0)){ showBmcBanner(); }
}

export function wireSupportUI(){
  // Always-visible Support button
  const btn = document.getElementById('bmacBtn');
  if(btn){ btn.id = 'supportBtn'; btn.textContent = 'Support'; btn.addEventListener('click', ()=>{ markSupportClicked(); }); }

  // Clicks to buymeacoffee links set clicked
  document.addEventListener('click', (e)=>{
    const a = (e.target && (e.target.closest && e.target.closest('a'))) || null;
    const href = a && a.getAttribute('href');
    if(href && /buymeacoffee\.com|buymeacoffee\.com\//i.test(href)){ markSupportClicked(); }
  }, true);

  // Best-effort: messages from BMC iframes/windows
  window.addEventListener('message', (ev)=>{ try{ const o=String(ev.origin||''); if(/buymeacoffee\.com$/i.test(new URL(o).hostname)){ markSupportClicked(); } }catch{} });
}

// Expose completed count for potential debugging
export function getSupportState(){ return loadState(); }

// Attach to global for non-module callers (e.g., settings.js convenience)
try{ window.EZQ_support = { resetSupportPrompts, markSupportClicked, maybeShowBmcAfterCompletion, showBmcBanner, hideBmcBanner, getSupportState, wireSupportUI }; }catch{}
