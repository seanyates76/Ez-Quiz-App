// Interactive Editor (beta) — MC/TF/YN only
// Non-invasive: syncs with #editor/#mirror and can be toggled on/off.

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
    const addBtn=document.createElement('button'); addBtn.className='btn'; addBtn.textContent='Add question';
    addBtn.addEventListener('click', ()=>{ st.model.push({ type:'MC', prompt:'', options:[{text:'',correct:false},{text:'',correct:false}]}); syncToEditor(); render(); });
    bar.appendChild(addBtn);
    mount.appendChild(bar);

    // Cards
    const wrap=document.createElement('div'); wrap.className='ie-grid';
    st.model.forEach((q,idx)=>{
      const card=document.createElement('div'); card.className='ie-card';
      // Top row: type + actions
      const row=document.createElement('div'); row.className='ie-row';
      const typeSel=document.createElement('select'); typeSel.className='toolbar-input ie-type';
      ['MC','TF','YN'].forEach(t=>{ const opt=document.createElement('option'); opt.value=t; opt.textContent=t; if(q.type===t) opt.selected=true; typeSel.appendChild(opt); });
      const actions=document.createElement('div'); actions.className='ie-actions';
      const up=document.createElement('button'); up.className='btn btn-ghost'; up.textContent='↑'; up.title='Move up';
      const down=document.createElement('button'); down.className='btn btn-ghost'; down.textContent='↓'; down.title='Move down';
      const del=document.createElement('button'); del.className='btn btn-ghost'; del.textContent='Delete';
      actions.append(up,down,del);
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
        addOpt.addEventListener('click', ()=>{ q.options.push({text:'',correct:false}); syncToEditor(); render(); });
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
      del.addEventListener('click', ()=>{ const a=getState().model; a.splice(idx,1); syncToEditor(); render(); });

      validate(card,q);
      wrap.appendChild(card);
    });
    mount.appendChild(wrap);
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
  }

  function syncFromEditor(){ const st=getState(); st.model = parseEditor(); }

  function show(on){ const {mount}=els(); if(!mount) return; mount.classList.toggle('hidden', !on); }

  function init(){
    const { toggle, editor } = els();
    if(toggle){ toggle.checked = loadEnabled(); toggle.addEventListener('change', ()=>{ const on=!!toggle.checked; getState().enabled=on; saveEnabled(on); if(on){ syncFromEditor(); render(); } show(on); }); }
    const on = loadEnabled(); getState().enabled = on; show(on);
    if(on){ syncFromEditor(); render(); }
    // Keep GUI synced if user types raw lines
    editor?.addEventListener('input', ()=>{ const st=getState(); if(!st.enabled) return; syncFromEditor(); render(); });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();

export default IE_NS;
