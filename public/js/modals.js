export function openModal(id){
  const el=document.getElementById(id); if(!el) return;
  // Close any other open modal to "replace" the view
  try{
    const openEls = document.querySelectorAll('.modal.is-open');
    openEls.forEach(m=>{ if(m && m!==el){ m.classList.remove('is-open'); m.setAttribute('aria-hidden','true'); } });
  }catch{}
  if(id==='settingsModal'){ /* settings are reflected by caller */ }
  el.classList.add('is-open');
  el.setAttribute('aria-hidden','false');
  const f=el.querySelector('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])');
  if(f) f.focus();
}
export function closeModal(id){ const el=document.getElementById(id); if(!el) return; el.classList.remove('is-open'); el.setAttribute('aria-hidden','true'); }

export function wireModals({ onPause, onResume }){
  const map = {
    helpBtn:'helpModal',
    settingsBtn:'settingsModal',
    promptBtn:'promptModal',
    versionInfoBtn:'releaseNotesModal',
    privacyLink:'privacyModal',
    termsLink:'termsModal'
  };
  Object.entries(map).forEach(([btnId, modalId])=>{
    const btn=document.getElementById(btnId);
    btn?.addEventListener('click', (e)=>{ try{ e?.preventDefault?.(); }catch{} if(onPause) onPause(); openModal(modalId); });
  });
  const closeMap = {
    helpClose:'helpModal',
    helpOk:'helpModal',
    settingsClose:'settingsModal',
    settingsSave:'settingsModal',
    promptClose:'promptModal',
    pbCancel:'promptModal',
    releaseNotesClose:'releaseNotesModal',
    releaseNotesOk:'releaseNotesModal',
    privacyClose:'privacyModal',
    privacyOk:'privacyModal',
    termsClose:'termsModal',
    termsOk:'termsModal'
  };
  Object.entries(closeMap).forEach(([btnId, modalId])=>{
    const btn=document.getElementById(btnId);
    btn?.addEventListener('click', ()=>{
      closeModal(modalId);
      // If Settings was closed and a beta refresh is pending, reload softly
      if(modalId === 'settingsModal'){
        try{
          const g = (window.__EZQ__ = window.__EZQ__ || {});
          // Prefer explicit pending redirect (e.g., to /beta)
          if(g.__betaPendingRedirect){
            const target = g.__betaPendingRedirect; g.__betaPendingRedirect = null; g.__betaRefreshPending = false;
            if(onResume) onResume();
            setTimeout(()=>{ try{ window.location.replace(target); }catch{ window.location.href = target; } }, 60);
            return;
          }
          if(g.__betaRefreshPending){ g.__betaRefreshPending = false; if(onResume) onResume(); setTimeout(()=>{ try{ window.location.reload(true); }catch{ window.location.reload(); } }, 60); return; }
        }catch{}
      }
      if(onResume) onResume();
    });
  });
  document.addEventListener('click', (e)=>{ const t=e.target; if(t && t.matches('.modal__backdrop')){ const id=t.getAttribute('data-close'); if(id){ closeModal(id); if(onResume) onResume(); } } });

  // Help accordion: only one open at a time
  const helpModal = document.getElementById('helpModal');
  if(helpModal){
    const syncAccordion = (ev)=>{
      const all = Array.from(helpModal.querySelectorAll('details.help-accordion'));
      const opened = ev?.target;
      if(opened && opened.hasAttribute('open')){
        all.forEach(d=>{ if(d!==opened) d.removeAttribute('open'); });
      }
    };
    helpModal.addEventListener('toggle', (e)=>{
      if(e.target && e.target.matches('details.help-accordion')) syncAccordion(e);
    });
    const backBtn = document.getElementById('helpBackToTop');
    backBtn?.addEventListener('click', ()=>{
      const body = helpModal.querySelector('.modal__body');
      try{ body?.scrollTo({ top: 0, behavior: 'smooth' }); }catch{ if(body) body.scrollTop = 0; }
    });
  }
}
