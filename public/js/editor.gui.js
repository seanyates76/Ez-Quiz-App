// Interactive Editor (beta) — MC/TF/YN only
// Non-invasive: syncs with #editor/#mirror and can be toggled on/off.
import { runParseFlow } from './generator.js';

const IE_NS = (()=>{
  const SKEY='ezq.ie.on';
  const els = ()=>({
    mount: document.getElementById('interactiveEditor'),
    toggle: document.getElementById('toggleInteractiveEditor'),
    editor: document.getElementById('editor'),
    mirror: document.getElementById('mirror'),
  });

  function getState(){ const g=(window.__EZQ__=window.__EZQ__||{}); return (g.ie=g.ie||{ enabled:false, model:[] }); }
  function saveEnabled(on){ try{ localStorage.setItem(SKEY, on?'1':'0'); }catch{} }
  function loadEnabled(){ try{ return localStorage.getItem(SKEY)==='1'; }catch{ return false; } }

  // Parser conversions
  function toLine(q){
    const t=q.type; const prompt=(q.prompt||'').trim();
    if(t==='MC'){
      const opts=q.options.filter(o=>o.text.trim()).map((o,i)=>`${String.fromCharCode(65+i)}) ${o.text.trim()}`);
      const letters = q.options.map((o,i)=> o.correct? String.fromCharCode(65+i):null).filter(Boolean).join(',');
      if(!prompt||!opts.length||!letters) return null;
      return `MC|${prompt}|${opts.join(';')}|${letters}`;
    }
    if(t==='TF'){
      if(!prompt||!('answer' in q)) return null; const a=q.answer?'T':'F'; return `TF|${prompt}|${a}`;
    }
    if(t==='YN'){
      if(!prompt||!('answer' in q)) return null; const a=q.answer?'Y':'N'; return `YN|${prompt}|${a}`;
    }
    return null;
  }
  function fromLine(line){
    const s=String(line||'').trim(); if(!s) return null;
    const [type, rest] = s.split('|',1)[0].toUpperCase().startsWith('MC')? ['MC', s.slice(3)]:
      s.toUpperCase().startsWith('TF|')? ['TF', s.slice(3)]:
      s.toUpperCase().startsWith('YN|')? ['YN', s.slice(3)]: [null, null];
    if(!type) return null;
    if(type==='MC'){
      const parts=s.split('|'); if(parts.length<4) return null;
      const prompt=parts[1]||''; const optsRaw=parts[2]||''; const ans=parts[3]||'';
      const opts=(optsRaw.split(';').map(x=>String(x||'').trim()).filter(Boolean)).map((t,i)=>({ text:t.replace(/^[A-Z]\)\s*/,'') , correct:false }));
      const set=new Set(String(ans||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean));
      opts.forEach((o,i)=>{ const L=String.fromCharCode(65+i); o.correct=set.has(L); });
      return { type:'MC', prompt, options:opts };
    }
    if(type==='TF'){
      const parts=s.split('|'); if(parts.length<3) return null; return { type:'TF', prompt:parts[1]||'', answer:(String(parts[2]||'').toUpperCase().startsWith('T')) };
    }
    if(type==='YN'){
      const parts=s.split('|'); if(parts.length<3) return null; return { type:'YN', prompt:parts[1]||'', answer:(String(parts[2]||'').toUpperCase().startsWith('Y')) };
    }
    return null;
  }

  function parseEditor(){ const {editor}=els(); const text=(editor?.value||'').trim(); if(!text) return [];
    const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const model=[]; for(const ln of lines){ const m=fromLine(ln); if(m) model.push(m); }
    return model; }

  function render(){
    const { mount } = els(); const st=getState(); if(!mount) return;
    mount.innerHTML='';
    // Toolbar
    const bar=document.createElement('div'); bar.className='ie-toolbar';
    const addMC=document.createElement('button'); addMC.className='btn'; addMC.type='button'; addMC.textContent='Add MC'; addMC.setAttribute('data-ie-add','MC');
    const addTF=document.createElement('button'); addTF.className='btn'; addTF.type='button'; addTF.textContent='Add TF'; addTF.setAttribute('data-ie-add','TF');
    const addYN=document.createElement('button'); addYN.className='btn'; addYN.type='button'; addYN.textContent='Add YN'; addYN.setAttribute('data-ie-add','YN');
    const spacer=document.createElement('span'); spacer.className='flex-spacer';
    const importBtn=document.createElement('button'); importBtn.className='btn btn-ghost'; importBtn.type='button'; importBtn.id='ieImport'; importBtn.textContent='Import from raw';
    const clearBtn=document.createElement('button'); clearBtn.className='btn btn-ghost'; clearBtn.type='button'; clearBtn.id='ieClear'; clearBtn.textContent='Clear all';
    addMC.addEventListener('click', ()=>{ st.model.push({ type:'MC', prompt:'', options:[{text:'',correct:false},{text:'',correct:false}]}); syncToEditor(); render(); scrollLast(); });
    addTF.addEventListener('click', ()=>{ st.model.push({ type:'TF', prompt:'', answer:false }); syncToEditor(); render(); scrollLast(); });
    addYN.addEventListener('click', ()=>{ st.model.push({ type:'YN', prompt:'', answer:false }); syncToEditor(); render(); scrollLast(); });
    importBtn.addEventListener('click', ()=>{ syncFromEditor(); render(); });
    clearBtn.addEventListener('click', ()=>{ st.model=[]; syncToEditor(); render(); });
    bar.append(addMC, addTF, addYN, spacer, importBtn, clearBtn);
    mount.appendChild(bar);

    // Cards
    const wrap=document.createElement('div'); wrap.className='ie-grid';
    st.model.forEach((q,idx)=>{
      const card=document.createElement('div'); card.className='ie-card'; card.setAttribute('draggable','true'); card.dataset.index = String(idx);
      // DnD
      card.addEventListener('dragstart', (e)=>{ e.dataTransfer?.setData('text/plain', String(idx)); card.classList.add('dragging'); });
      card.addEventListener('dragend', ()=> card.classList.remove('dragging'));
      card.addEventListener('dragover', (e)=>{ e.preventDefault(); card.classList.add('drag-over'); });
      card.addEventListener('dragleave', ()=> card.classList.remove('drag-over'));
      card.addEventListener('drop', (e)=>{
        e.preventDefault(); card.classList.remove('drag-over');
        const from = parseInt(e.dataTransfer?.getData('text/plain')||'-1',10);
        const to = parseInt(card.dataset.index||'-1',10);
        if(isFinite(from)&&isFinite(to)&&from!==to){ const arr=getState().model; const it=arr.splice(from,1)[0]; arr.splice(to,0,it); syncToEditor(); render(); }
      });
      // Top row: type + actions
      const row=document.createElement('div'); row.className='ie-row';
      const typeSel=document.createElement('select'); typeSel.className='toolbar-input ie-type';
      ['MC','TF','YN'].forEach(t=>{ const opt=document.createElement('option'); opt.value=t; opt.textContent=t; if(q.type===t) opt.selected=true; typeSel.appendChild(opt); });
      const actions=document.createElement('div'); actions.className='ie-actions';
      const up=document.createElement('button'); up.className='btn btn-ghost'; up.textContent='↑'; up.title='Move up';
      const down=document.createElement('button'); down.className='btn btn-ghost'; down.textContent='↓'; down.title='Move down';
      const dup=document.createElement('button'); dup.className='btn btn-ghost'; dup.textContent='Duplicate';
      const del=document.createElement('button'); del.className='btn btn-ghost'; del.textContent='Delete';
      actions.append(up,down,dup,del);
      row.append(typeSel, actions);
      card.appendChild(row);

      // Prompt
      const prompt=document.createElement('input'); prompt.type='text'; prompt.className='toolbar-input ie-prompt'; prompt.placeholder='Question prompt'; prompt.value=q.prompt||'';
      card.appendChild(prompt);

      // Answers
      const area=document.createElement('div'); area.className='ie-choices';
      if(q.type==='MC'){
        q.options=q.options||[]; if(q.options.length===0) q.options=[{text:'',correct:false},{text:'',correct:false}];
        q.options.forEach((opt,i)=>{
          const line=document.createElement('div'); line.className='ie-choice';
          const chk=document.createElement('input'); chk.type='checkbox'; chk.checked=!!opt.correct; chk.title='Correct';
          const txt=document.createElement('input'); txt.type='text'; txt.value=opt.text||''; txt.placeholder=`Option ${String.fromCharCode(65+i)}`;
          const rm=document.createElement('button'); rm.className='btn btn-ghost'; rm.textContent='✕'; rm.title='Remove option';
          line.append(chk, txt, rm); area.appendChild(line);
          chk.addEventListener('change', ()=>{ opt.correct=!!chk.checked; syncToEditor(); validate(card,q); });
          txt.addEventListener('input', ()=>{ opt.text=txt.value; syncToEditor(); validate(card,q); });
          rm.addEventListener('click', ()=>{ q.options.splice(i,1); syncToEditor(); render(); });
        });
        const addOpt=document.createElement('button'); addOpt.className='btn'; addOpt.textContent='Add option';
        addOpt.disabled = q.options.length>=8;
        addOpt.addEventListener('click', ()=>{ if(q.options.length<8){ q.options.push({text:'',correct:false}); syncToEditor(); render(); } });
        area.appendChild(addOpt);
      } else {
        const onel=document.createElement('div'); onel.className='ie-choice';
        const chk=document.createElement('select');
        const opts=(q.type==='TF')?[['T','True'],['F','False']] : [['Y','Yes'],['N','No']];
        opts.forEach(([v,l])=>{ const o=document.createElement('option'); o.value=v; o.textContent=l; if(((q.type==='TF' && (q.answer? 'T':'F')===v) || (q.type==='YN' && (q.answer? 'Y':'N')===v))) o.selected=true; chk.appendChild(o); });
        const lbl=document.createElement('span'); lbl.textContent='Correct';
        onel.append(chk,lbl);
        area.appendChild(onel);
        chk.addEventListener('change', ()=>{ const v=chk.value; q.answer = (q.type==='TF')? v==='T' : v==='Y'; syncToEditor(); validate(card,q); });
      }
      card.appendChild(area);

      // Validation status
      const status=document.createElement('div'); status.className='ie-mono'; card.appendChild(status);

      // Wire changes
      typeSel.addEventListener('change', ()=>{ const t=typeSel.value; if(t==='MC'){ q.type='MC'; q.options=q.options&&q.options.length?q.options:[{text:'',correct:false},{text:'',correct:false}]; delete q.answer; } else { q.type=t; q.answer=false; q.options=[]; } syncToEditor(); render(); });
      prompt.addEventListener('input', ()=>{ q.prompt=prompt.value; syncToEditor(); validate(card,q); });
      up.addEventListener('click', ()=>{ if(idx>0){ const a=getState().model; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; syncToEditor(); render(); }});
      down.addEventListener('click', ()=>{ const a=getState().model; if(idx<a.length-1){ [a[idx+1],a[idx]]=[a[idx],a[idx+1]]; syncToEditor(); render(); }});
      dup.addEventListener('click', ()=>{ const a=getState().model; a.splice(idx+1,0, JSON.parse(JSON.stringify(q))); syncToEditor(); render(); });
      del.addEventListener('click', ()=>{ const a=getState().model; a.splice(idx,1); syncToEditor(); render(); });

      validate(card,q);
      wrap.appendChild(card);
    });
    mount.appendChild(wrap);

    // Summary
    const summary = document.createElement('div');
    const total = st.model.length;
    const okCount = st.model.filter(q=>{
      if(!q.prompt||!q.prompt.trim()) return false;
      if(q.type==='MC'){ const filled=q.options.filter(o=>o.text.trim()).length; const corr=q.options.filter(o=>o.correct).length; return filled>=2 && corr>=1; }
      if(q.type==='TF'||q.type==='YN'){ return typeof q.answer==='boolean'; }
      return false;
    }).length;
    summary.className='ie-mono';
    summary.textContent = `Questions: ${total} — Valid: ${okCount}`;
    mount.appendChild(summary);

    // Event delegation fallback: ensures clicks work even if nodes re-render quickly
    if(!mount.__ieDelegated){
      const findUp = (node, pred, stop) => { let el = node && node.nodeType===1 ? node : node?.parentElement; while(el && el!==stop){ if(pred(el)) return el; el = el.parentElement; } return null; };
      mount.addEventListener('click', (e)=>{
        try{
          const add = findUp(e.target, el=> el.hasAttribute && el.hasAttribute('data-ie-add'), mount);
          if(add){ e.preventDefault(); const type = add.getAttribute('data-ie-add'); const st=getState(); if(type==='MC') st.model.push({ type:'MC', prompt:'', options:[{text:'',correct:false},{text:'',correct:false}]}); if(type==='TF') st.model.push({ type:'TF', prompt:'', answer:false }); if(type==='YN') st.model.push({ type:'YN', prompt:'', answer:false }); syncToEditor(); render(); scrollLast(); return; }
          const imp = findUp(e.target, el=> el.id==='ieImport', mount); if(imp){ e.preventDefault(); syncFromEditor(); render(); return; }
          const clr = findUp(e.target, el=> el.id==='ieClear', mount); if(clr){ e.preventDefault(); const st=getState(); st.model=[]; syncToEditor(); render(); return; }
        }catch{}
      }, false);
      mount.__ieDelegated = true;
    }
  }

  function scrollLast(){ try{ const m=els().mount; const last = m && m.querySelector('.ie-card:last-of-type'); last && last.scrollIntoView({ behavior:'smooth', block:'end' }); }catch{}
  }

  function validate(card,q){
    const ok = (()=>{
      if(!q.prompt || !q.prompt.trim()) return false;
      if(q.type==='MC'){ const filled=q.options.filter(o=>o.text.trim()).length; const corr=q.options.filter(o=>o.correct).length; return filled>=2 && corr>=1; }
      if(q.type==='TF'||q.type==='YN'){ return typeof q.answer==='boolean'; }
      return false;
    })();
    let note=card.querySelector('.ie-valid,.ie-error'); if(!note){ note=document.createElement('div'); card.appendChild(note); }
    note.className = ok? 'ie-valid' : 'ie-error';
    note.textContent = ok? 'Looks good' : 'Incomplete — add text and mark a correct answer';
  }

  function syncToEditor(){
    const {editor, mirror}=els(); const st=getState();
    const lines = st.model.map(toLine).filter(Boolean).join('\n');
    if(editor){ editor.value = lines; editor.dispatchEvent(new Event('input', { bubbles:true })); }
    if(mirror){ mirror.value = lines; mirror.dispatchEvent(new Event('input', { bubbles:true })); }
    // Ask the app to re-parse so Start enables/disabled correctly
    try{
      const topic = (document.getElementById('topicInput')?.value || 'Edited').trim();
      runParseFlow(lines, topic || 'Edited', '');
      // Ensure mirror is visible when content exists
      const box = document.getElementById('mirrorBox');
      if(box && lines){ box.setAttribute('data-on','true'); }
    }catch{}
  }

  function syncFromEditor(){ const st=getState(); st.model = parseEditor(); }

  function show(on){ const {mount}=els(); if(!mount) return; mount.classList.toggle('hidden', !on); }

  function init(){
    const { toggle, editor } = els();
    if(toggle){ toggle.checked = loadEnabled(); toggle.addEventListener('change', ()=>{ const on=!!toggle.checked; getState().enabled=on; saveEnabled(on); if(on){ syncFromEditor(); render(); } show(on); }); }
    const on = loadEnabled(); getState().enabled = on; show(on);
    if(on){
      syncFromEditor(); render();
      try{ const topic=(document.getElementById('topicInput')?.value||'Edited').trim(); runParseFlow((els().editor?.value)||'', topic||'Edited',''); }catch{}
    }
    // Keep GUI synced if user types raw lines
    editor?.addEventListener('input', ()=>{ const st=getState(); if(!st.enabled) return; syncFromEditor(); render(); });

    // Document-level delegation as final safety (Brave/Firefox quirks)
    if(!window.__EZQ__._ieDocDelegated){
      const findUp = (node, pred) => { let el = node && (node.nodeType===1?node:node.parentElement); while(el){ if(pred(el)) return el; el = el.parentElement; } return null; };
      document.addEventListener('click', (e)=>{
        const mt = document.getElementById('interactiveEditor'); if(!mt || mt.classList.contains('hidden')) return;
        const add = findUp(e.target, el=> el.hasAttribute && el.hasAttribute('data-ie-add'));
        if(add && mt.contains(add)){
          e.preventDefault(); const type = add.getAttribute('data-ie-add'); const st=getState();
          if(type==='MC') st.model.push({ type:'MC', prompt:'', options:[{text:'',correct:false},{text:'',correct:false}]});
          if(type==='TF') st.model.push({ type:'TF', prompt:'', answer:false });
          if(type==='YN') st.model.push({ type:'YN', prompt:'', answer:false });
          syncToEditor(); render(); return;
        }
        const imp = findUp(e.target, el=> el.id==='ieImport');
        if(imp && mt.contains(imp)){ e.preventDefault(); syncFromEditor(); render(); return; }
        const clr = findUp(e.target, el=> el.id==='ieClear');
        if(clr && mt.contains(clr)){ e.preventDefault(); const st=getState(); st.model=[]; syncToEditor(); render(); return; }
      }, true);
      window.__EZQ__._ieDocDelegated = true;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();

export default IE_NS;
