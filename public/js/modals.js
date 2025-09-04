export function openModal(id){ const el=document.getElementById(id); if(!el) return; if(id==='settingsModal'){ /* settings are reflected by caller */ } el.classList.add('is-open'); el.setAttribute('aria-hidden','false'); const f=el.querySelector('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'); if(f) f.focus(); }
export function closeModal(id){ const el=document.getElementById(id); if(!el) return; el.classList.remove('is-open'); el.setAttribute('aria-hidden','true'); }

export function wireModals({ onPause, onResume }){
  const map = { helpBtn:'helpModal', settingsBtn:'settingsModal', promptBtn:'promptModal' };
  Object.entries(map).forEach(([btnId, modalId])=>{
    const btn=document.getElementById(btnId);
    btn?.addEventListener('click', ()=>{ if(onPause) onPause(); openModal(modalId); });
  });
  const closeMap = { helpClose:'helpModal', helpOk:'helpModal', settingsClose:'settingsModal', settingsSave:'settingsModal', promptClose:'promptModal', pbCancel:'promptModal' };
  Object.entries(closeMap).forEach(([btnId, modalId])=>{
    const btn=document.getElementById(btnId);
    btn?.addEventListener('click', ()=>{ closeModal(modalId); if(onResume) onResume(); });
  });
  document.addEventListener('click', (e)=>{ const t=e.target; if(t && t.matches('.modal__backdrop')){ const id=t.getAttribute('data-close'); if(id){ closeModal(id); if(onResume) onResume(); } } });
}

