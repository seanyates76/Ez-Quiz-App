// Interactive Editor (beta) — rebuilt v2
// Simple, robust, no global delegation; uses pointerdown to beat Options capture
import { runParseFlow } from './generator.js';

const IE2 = (()=>{
  const SKEY = 'ezq.ie.v2.on';
  const state = { enabled:false, model:[] };

  const qs = (id) => document.getElementById(id);
  const els = () => ({
    mount: qs('interactiveEditor'),
    toggle: qs('toggleInteractiveEditor'),
    editor: qs('editor'),
    mirror: qs('mirror'),
    grid: qs('ieGrid'),
    summary: qs('ieSummary'),
  });

  function saveEnabled(on){ try{ localStorage.setItem(SKEY, on?'1':'0'); }catch{} }
  function loadEnabled(){ try{ return localStorage.getItem(SKEY)==='1'; }catch{ return false; } }

  // Formatting (match app parser rules)
  function toLine(q){
    const p=(q.prompt||'').trim();
    if(q.type==='MC'){
      const opts=(q.options||[]).filter(o=>o.text && o.text.trim());
      const letters=(q.options||[]).map((o,i)=>o.correct?String.fromCharCode(65+i):null).filter(Boolean).join(',');
      if(!p||!opts.length||!letters) return null;
      const optText=opts.map((o,i)=>`${String.fromCharCode(65+i)}) ${o.text.trim()}`).join(';');
      return `MC|${p}|${optText}|${letters}`;
    }
    if(q.type==='TF'){ if(!p||typeof q.answer!=='boolean') return null; return `TF|${p}|${q.answer?'T':'F'}`; }
    if(q.type==='YN'){ if(!p||typeof q.answer!=='boolean') return null; return `YN|${p}|${q.answer?'Y':'N'}`; }
    return null;
  }
  function fromLine(s){
    const line=String(s||'').trim(); if(!line) return null; const up=line.toUpperCase();
    if(up.startsWith('MC|')){ const p=line.split('|'); if(p.length<4) return null; const prompt=p[1]||''; const optsRaw=p[2]||''; const ans=p[3]||''; const opts=(optsRaw.split(';').map(x=>String(x||'').trim()).filter(Boolean)).map(t=>({text:t.replace(/^[A-Z]\)\s*/,'').trim(), correct:false})); const set=new Set(String(ans||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean)); opts.forEach((o,i)=>{ const L=String.fromCharCode(65+i); o.correct=set.has(L); }); return { type:'MC', prompt:prompt, options:opts }; }
    if(up.startsWith('TF|')){ const p=line.split('|'); if(p.length<3) return null; return { type:'TF', prompt:p[1]||'', answer:(String(p[2]||'').toUpperCase().startsWith('T')) }; }
    if(up.startsWith('YN|')){ const p=line.split('|'); if(p.length<3) return null; return { type:'YN', prompt:p[1]||'', answer:(String(p[2]||'').toUpperCase().startsWith('Y')) }; }
    return null;
  }
  function parseEditor(){ const ed=els().editor; const txt=(ed?.value||'').trim(); if(!txt) return []; return txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(fromLine).filter(Boolean); }

  function syncToEditor(){
    const { editor, mirror } = els();
    const lines = state.model.map(toLine).filter(Boolean).join('\n');
    if(editor){ editor.value = lines; editor.dispatchEvent(new Event('input', { bubbles:true })); }
    if(mirror){ mirror.value = lines; mirror.dispatchEvent(new Event('input', { bubbles:true })); }
    try{ const topic=(qs('topicInput')?.value||'Edited').trim()||'Edited'; runParseFlow(lines, topic, ''); const box=qs('mirrorBox'); if(box && lines){ box.setAttribute('data-on','true'); } }catch{}
  }
  function syncFromEditor(){ state.model = parseEditor(); renderCards(); renderSummary(); }

  function setEnabled(on){ state.enabled=!!on; saveEnabled(state.enabled); const m=els().mount; if(m) m.classList.toggle('hidden', !state.enabled); if(state.enabled && state.model.length===0) syncFromEditor(); renderCards(); renderSummary(); }

  function buildUI(){
    const m=els().mount; if(!m) return;
    m.innerHTML = `
      <div class="ie-toolbar" role="group" aria-label="Interactive editor toolbar">
        <button id="ieAddMC" class="btn" type="button" title="Add Multiple Choice">Add MC</button>
        <button id="ieAddTF" class="btn" type="button" title="Add True/False">Add TF</button>
        <button id="ieAddYN" class="btn" type="button" title="Add Yes/No">Add YN</button>
        <span class="flex-spacer"></span>
        <button id="ieImport" class="btn btn-ghost" type="button" title="Import from raw">Import from raw</button>
        <button id="ieClear" class="btn btn-ghost" type="button" title="Clear all">Clear all</button>
      </div>
      <div id="ieGrid" class="ie-grid" aria-live="polite"></div>
      <div id="ieSummary" class="ie-mono"></div>
    `;

    // Wire toolbar using pointerdown in capture phase to beat Options' doc-level click-away
    const bind = (id, fn)=>{ const b=qs(id); if(!b) return; const h=(e)=>{ try{ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch{} fn(); }; b.addEventListener('pointerdown', h, true); b.addEventListener('click', h, false); };
    bind('ieAddMC', ()=>{ state.model.push({ type:'MC', prompt:'', options:[{text:'',correct:false},{text:'',correct:false}]}); syncToEditor(); renderCards(); ensureLastVisible(); renderSummary(); const s=els().summary; if(s) s.textContent += ' • Added MC'; });
    bind('ieAddTF', ()=>{ state.model.push({ type:'TF', prompt:'', answer:false }); syncToEditor(); renderCards(); ensureLastVisible(); renderSummary(); const s=els().summary; if(s) s.textContent += ' • Added TF'; });
    bind('ieAddYN', ()=>{ state.model.push({ type:'YN', prompt:'', answer:false }); syncToEditor(); renderCards(); ensureLastVisible(); renderSummary(); const s=els().summary; if(s) s.textContent += ' • Added YN'; });
    bind('ieImport', ()=>{ syncFromEditor(); });
    bind('ieClear', ()=>{ state.model=[]; syncToEditor(); renderCards(); renderSummary(); });
  }

  function ensureLastVisible(){ try{ const m=els().mount; const last = m && m.querySelector('.ie-card:last-of-type'); last && last.scrollIntoView({ behavior:'smooth', block:'end' }); }catch{} }
  function ok(q){ if(!q||!q.type) return false; if(!q.prompt||!q.prompt.trim()) return false; if(q.type==='MC'){ const a=(q.options||[]); const filled=a.filter(o=>o.text&&o.text.trim()).length; const corr=a.filter(o=>o.correct).length; return filled>=2 && corr>=1; } if(q.type==='TF'||q.type==='YN'){ return typeof q.answer==='boolean'; } return false; }

  function btn(text, title){ const b=document.createElement('button'); b.className='btn btn-ghost'; b.type='button'; b.textContent=text; if(title) b.title=title; return b; }

  function renderCards(){
    const g=els().grid; if(!g) return; g.innerHTML='';
    state.model.forEach((q,idx)=>{
      const card=document.createElement('div'); card.className='ie-card'; card.dataset.idx=String(idx);
      const row=document.createElement('div'); row.className='ie-row';
      const type=document.createElement('select'); type.className='toolbar-input ie-type'; ['MC','TF','YN'].forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; if(q.type===t) o.selected=true; type.appendChild(o); });
      const actions=document.createElement('div'); actions.className='ie-actions'; const up=btn('↑','Move up'), down=btn('↓','Move down'), dup=btn('Duplicate','Duplicate'), del=btn('Delete','Delete'); actions.append(up,down,dup,del); row.append(type, actions); card.appendChild(row);
      const prompt=document.createElement('input'); prompt.type='text'; prompt.className='toolbar-input ie-prompt'; prompt.placeholder='Question prompt'; prompt.value=q.prompt||''; card.appendChild(prompt);
      const area=document.createElement('div'); area.className='ie-choices';
      if(q.type==='MC'){
        q.options=q.options||[]; if(q.options.length<2) q.options=[{text:'',correct:false},{text:'',correct:false}];
        q.options.forEach((opt,i)=>{ const line=document.createElement('div'); line.className='ie-choice'; const chk=document.createElement('input'); chk.type='checkbox'; chk.checked=!!opt.correct; const txt=document.createElement('input'); txt.type='text'; txt.value=opt.text||''; txt.placeholder=`Option ${String.fromCharCode(65+i)}`; const rm=btn('✕','Remove option'); line.append(chk,txt,rm); area.appendChild(line); chk.addEventListener('change', ()=>{ opt.correct=!!chk.checked; syncToEditor(); renderSummary(); }); txt.addEventListener('input', ()=>{ opt.text=txt.value; syncToEditor(); renderSummary(); }); rm.addEventListener('click', ()=>{ q.options.splice(i,1); syncToEditor(); renderCards(); renderSummary(); }); });
        const addOpt=btn('Add option','Add option'); addOpt.addEventListener('click', ()=>{ if(q.options.length<8){ q.options.push({text:'',correct:false}); syncToEditor(); renderCards(); renderSummary(); } }); area.appendChild(addOpt);
      } else {
        const line=document.createElement('div'); line.className='ie-choice'; const sel=document.createElement('select'); const opts=(q.type==='TF')?[['T','True'],['F','False']]:[['Y','Yes'],['N','No']]; opts.forEach(([v,l])=>{ const o=document.createElement('option'); o.value=v; o.textContent=l; sel.appendChild(o); }); sel.value = (q.type==='TF') ? (q.answer?'T':'F') : (q.answer?'Y':'N'); const lbl=document.createElement('span'); lbl.textContent='Correct'; line.append(sel,lbl); area.appendChild(line); sel.addEventListener('change', ()=>{ const v=sel.value; q.answer = (q.type==='TF') ? v==='T' : v==='Y'; syncToEditor(); renderSummary(); });
      }
      card.appendChild(area);
      const status=document.createElement('div'); status.className = ok(q)?'ie-valid':'ie-error'; status.textContent = ok(q)?'Looks good':'Incomplete — add text and mark a correct answer'; card.appendChild(status);
      type.addEventListener('change', ()=>{ const t=type.value; if(t==='MC'){ q.type='MC'; q.options=q.options&&q.options.length?q.options:[{text:'',correct:false},{text:'',correct:false}]; delete q.answer; } else { q.type=t; q.answer=false; q.options=[]; } syncToEditor(); renderCards(); renderSummary(); });
      prompt.addEventListener('input', ()=>{ q.prompt=prompt.value; syncToEditor(); status.className = ok(q)?'ie-valid':'ie-error'; status.textContent = ok(q)?'Looks good':'Incomplete — add text and mark a correct answer'; renderSummary(); });
      up.addEventListener('click', ()=>{ if(idx>0){ const a=state.model; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; syncToEditor(); renderCards(); }});
      down.addEventListener('click', ()=>{ const a=state.model; if(idx<a.length-1){ [a[idx+1],a[idx]]=[a[idx],a[idx+1]]; syncToEditor(); renderCards(); }});
      dup.addEventListener('click', ()=>{ const a=state.model; a.splice(idx+1,0, JSON.parse(JSON.stringify(q))); syncToEditor(); renderCards(); });
      del.addEventListener('click', ()=>{ const a=state.model; a.splice(idx,1); syncToEditor(); renderCards(); renderSummary(); });
      g.appendChild(card);
    });
  }

  function renderSummary(){ const s=els().summary; if(!s) return; const total=state.model.length; const valid=state.model.filter(ok).length; s.textContent = `Questions: ${total} — Valid: ${valid}`; }

  function init(){
    buildUI();
    const t=els().toggle; if(t){ t.checked = loadEnabled(); t.addEventListener('change', ()=> setEnabled(!!t.checked)); }
    setEnabled(loadEnabled());
    els().editor?.addEventListener('input', ()=>{ if(!state.enabled) return; syncFromEditor(); });
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
  return { init };
})();

export default IE2;
