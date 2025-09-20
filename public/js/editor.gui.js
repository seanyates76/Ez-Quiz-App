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
    if(q.type==='MT'){
      const leftRaw=Array.isArray(q.left)?q.left:[];
      const rightRaw=Array.isArray(q.right)?q.right:[];
      const pairsRaw=Array.isArray(q.pairs)?q.pairs:[];
      const left=[]; const leftMap=new Map();
      leftRaw.forEach((val,i)=>{ const t=String(val||'').trim(); if(t){ leftMap.set(i,left.length); left.push(t); } });
      const right=[]; const rightMap=new Map();
      rightRaw.forEach((val,i)=>{ const t=String(val||'').trim(); if(t){ rightMap.set(i,right.length); right.push(t); } });
      const pairs=pairsRaw.map(pair=>Array.isArray(pair)?pair.slice(0,2).map(v=>parseInt(v,10)):[NaN,NaN])
        .map(([li,ri])=>({ li, ri, leftIdx:leftMap.has(li)?leftMap.get(li):-1, rightIdx:rightMap.has(ri)?rightMap.get(ri):-1 }))
        .filter(p=>p.leftIdx>=0 && p.rightIdx>=0);
      if(!p||!left.length||!right.length||!pairs.length) return null;
      const leftText = left.map((text,i)=>`${i+1}) ${text}`).join(';');
      const rightText = right.map((text,i)=>`${String.fromCharCode(65+i)}) ${text}`).join(';');
      const pairText = pairs.map(({leftIdx,rightIdx})=>`${leftIdx+1}-${String.fromCharCode(65+rightIdx)}`).join(',');
      if(!pairText) return null;
      return `MT|${p}|${leftText}|${rightText}|${pairText}`;
    }
    return null;
  }
  function fromLine(s){
    const line=String(s||'').trim(); if(!line) return null; const up=line.toUpperCase();
    if(up.startsWith('MC|')){ const p=line.split('|'); if(p.length<4) return null; const prompt=p[1]||''; const optsRaw=p[2]||''; const ans=p[3]||''; const opts=(optsRaw.split(';').map(x=>String(x||'').trim()).filter(Boolean)).map(t=>({text:t.replace(/^[A-Z]\)\s*/,'').trim(), correct:false})); const set=new Set(String(ans||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean)); opts.forEach((o,i)=>{ const L=String.fromCharCode(65+i); o.correct=set.has(L); }); return { type:'MC', prompt:prompt, options:opts }; }
    if(up.startsWith('TF|')){ const p=line.split('|'); if(p.length<3) return null; return { type:'TF', prompt:p[1]||'', answer:(String(p[2]||'').toUpperCase().startsWith('T')) }; }
    if(up.startsWith('YN|')){ const p=line.split('|'); if(p.length<3) return null; return { type:'YN', prompt:p[1]||'', answer:(String(p[2]||'').toUpperCase().startsWith('Y')) }; }
    if(up.startsWith('MT|')){
      const p=line.split('|'); if(p.length<5) return null;
      const prompt=p[1]||'';
      const leftRaw=p[2]||'';
      const rightRaw=p[3]||'';
      const pairsRaw=p[4]||'';
      const left=leftRaw.split(';').map(x=>String(x||'').trim().replace(/^\d+\)\s*/,'').trim()).filter(Boolean);
      const right=rightRaw.split(';').map(x=>String(x||'').trim().replace(/^.{1}\)\s*/,'').trim()).filter(Boolean);
      const pairs=pairsRaw.split(',').map(x=>String(x||'').trim()).filter(Boolean).map(entry=>{
        const parts=entry.split('-');
        const li=parseInt((parts[0]||'').trim(),10)-1;
        const ri=((parts[1]||'').trim().toUpperCase().charCodeAt(0))-65;
        return [Number.isInteger(li)?li:NaN, Number.isNaN(ri)?NaN:ri];
      }).filter(([li,ri])=>Number.isInteger(li)&&li>=0&&li<left.length&&Number.isInteger(ri)&&ri>=0&&ri<right.length);
      return { type:'MT', prompt:prompt, left:left.length?left:['',''], right:right.length?right:['',''], pairs:pairs.length?pairs:[[0,0]] };
    }
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
    const mountEl=els().mount; if(!mountEl) return;
    mountEl.innerHTML = `
      <div class="ie-toolbar" role="group" aria-label="Interactive editor toolbar">
        <button id="ieAddMC" class="btn" type="button" title="Add Multiple Choice">Add MC</button>
        <button id="ieAddTF" class="btn" type="button" title="Add True/False">Add TF</button>
        <button id="ieAddYN" class="btn" type="button" title="Add Yes/No">Add YN</button>
        <button id="ieAddMT" class="btn" type="button" title="Add Matching">Add MT</button>
        <span class="flex-spacer"></span>
        <button id="ieImport" class="btn btn-ghost" type="button" title="Import from raw">Import from raw</button>
        <button id="ieClear" class="btn btn-ghost" type="button" title="Clear all">Clear all</button>
      </div>
      <div id="ieGrid" class="ie-grid" aria-live="polite"></div>
      <div id="ieSummary" class="ie-mono">IE ready — Hotkeys: M=MC, T=TF, Y=YN, H=MT</div>
    `;

    // Wire toolbar using pointerdown in capture phase to beat Options' doc-level click-away
    const bind = (id, fn)=>{ const b=qs(id); if(!b) return; const h=(e)=>{ try{ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch{} fn(); }; b.addEventListener('pointerdown', h, true); b.addEventListener('click', h, false); };
    const addQ=(type)=>{ if(type==='MC') state.model.push({ type:'MC', prompt:'', options:[{text:'',correct:false},{text:'',correct:false}]}); if(type==='TF') state.model.push({ type:'TF', prompt:'', answer:false }); if(type==='YN') state.model.push({ type:'YN', prompt:'', answer:false }); if(type==='MT') state.model.push({ type:'MT', prompt:'', left:['',''], right:['',''], pairs:[[0,0]] }); syncToEditor(); renderCards(); ensureLastVisible(); renderSummary(); const s=els().summary; if(s) s.textContent += ` • Added ${type}`; };
    bind('ieAddMC', ()=> addQ('MC'));
    bind('ieAddTF', ()=> addQ('TF'));
    bind('ieAddYN', ()=> addQ('YN'));
    bind('ieAddMT', ()=> addQ('MT'));
    bind('ieImport', ()=>{ syncFromEditor(); });
    bind('ieClear', ()=>{ state.model=[]; syncToEditor(); renderCards(); renderSummary(); });
    // Minimal inline diagnostics: show pointerdown/click targets in summary
    const s=els().summary;
    if(mountEl){
      const pd=(e)=>{ if(s){ s.textContent = `pd:${(e.target&&e.target.id)||e.target.tagName}`; } };
      const ck=(e)=>{ if(s){ s.textContent += ` | click:${(e.target&&e.target.id)||e.target.tagName}`; } };
      mountEl.addEventListener('pointerdown', pd, true);
      mountEl.addEventListener('click', ck, true);
    }

    // Keyboard shortcuts for reliability even if pointer events are blocked
    document.addEventListener('keydown', (e)=>{
      if(!state.enabled) return;
      const k=e.key.toLowerCase();
      if(k==='m'){ e.preventDefault(); addQ('MC'); }
      else if(k==='t'){ e.preventDefault(); addQ('TF'); }
      else if(k==='y'){ e.preventDefault(); addQ('YN'); }
      else if(k==='h'){ e.preventDefault(); addQ('MT'); }
    });
  }

  // Document-level capture safety net: handle IE toolbar clicks before
  // Options' own document capture closes the panel.
  function ensureDocDelegation(){
    if(window.__EZQ__ && window.__EZQ__.__ieV2Doc){ return; }
    const handler = (e)=>{
      const mt = qs('interactiveEditor'); if(!mt || mt.classList.contains('hidden')) return;
      let n = e.target && (e.target.nodeType===1? e.target : e.target.parentElement);
      const isInside = (el)=> !!(el && mt.contains(el));
      const findUp = (sel)=>{ let x=n; while(x){ if(x.matches && x.matches(sel)) return x; x = x.parentElement; } return null; };
      if(!isInside(n)) return;
      const add = findUp('[id="ieAddMC"], [id="ieAddTF"], [id="ieAddYN"], [id="ieAddMT"], [data-ie-add]');
      const imp = add ? null : findUp('#ieImport');
      const clr = (!add && !imp) ? findUp('#ieClear') : null;
      if(add||imp||clr){
        try{ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch{}
        if(add){
          const type = add.getAttribute('data-ie-add') || (add.id==='ieAddTF'?'TF': add.id==='ieAddYN'?'YN': add.id==='ieAddMT'?'MT':'MC');
          if(type==='MC') state.model.push({ type:'MC', prompt:'', options:[{text:'',correct:false},{text:'',correct:false}]});
          if(type==='TF') state.model.push({ type:'TF', prompt:'', answer:false });
          if(type==='YN') state.model.push({ type:'YN', prompt:'', answer:false });
          if(type==='MT') state.model.push({ type:'MT', prompt:'', left:['',''], right:['',''], pairs:[[0,0]] });
          syncToEditor(); renderCards(); ensureLastVisible(); renderSummary();
        } else if(imp){
          syncFromEditor();
        } else if(clr){
          state.model=[]; syncToEditor(); renderCards(); renderSummary();
        }
      }
    };
    // Prefer pointerdown capture to beat other capture listeners
    document.addEventListener('pointerdown', handler, true);
    document.addEventListener('click', handler, true);
    window.__EZQ__ = window.__EZQ__ || {}; window.__EZQ__.__ieV2Doc = true;
  }

  function ensureLastVisible(){ try{ const m=els().mount; const last = m && m.querySelector('.ie-card:last-of-type'); last && last.scrollIntoView({ behavior:'smooth', block:'end' }); }catch{} }
  function ok(q){
    if(!q||!q.type) return false;
    if(!q.prompt||!q.prompt.trim()) return false;
    if(q.type==='MC'){
      const a=(q.options||[]);
      const filled=a.filter(o=>o.text&&o.text.trim()).length;
      const corr=a.filter(o=>o.correct).length;
      return filled>=2 && corr>=1;
    }
    if(q.type==='TF'||q.type==='YN'){ return typeof q.answer==='boolean'; }
    if(q.type==='MT'){
      const left=(Array.isArray(q.left)?q.left:[]).map(v=>String(v||'').trim());
      const right=(Array.isArray(q.right)?q.right:[]).map(v=>String(v||'').trim());
      const pairs=Array.isArray(q.pairs)?q.pairs:[];
      if(!left.length||!right.length||!pairs.length) return false;
      return pairs.every(pair=>{
        if(!Array.isArray(pair)||pair.length<2) return false;
        const li=parseInt(pair[0],10);
        const ri=parseInt(pair[1],10);
        if(!Number.isInteger(li)||!Number.isInteger(ri)) return false;
        if(li<0||li>=left.length||ri<0||ri>=right.length) return false;
        if(!left[li]||!right[ri]) return false;
        return true;
      });
    }
    return false;
  }

  function btn(text, title){ const b=document.createElement('button'); b.className='btn btn-ghost'; b.type='button'; b.textContent=text; if(title) b.title=title; return b; }

  function renderCards(){
    const g=els().grid; if(!g) return; g.innerHTML='';
    state.model.forEach((q,idx)=>{
      const card=document.createElement('div'); card.className='ie-card'; card.dataset.idx=String(idx);
      const row=document.createElement('div'); row.className='ie-row';
      const type=document.createElement('select'); type.className='toolbar-input ie-type'; ['MC','TF','YN','MT'].forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; if(q.type===t) o.selected=true; type.appendChild(o); });
      const actions=document.createElement('div'); actions.className='ie-actions'; const up=btn('↑','Move up'), down=btn('↓','Move down'), dup=btn('Duplicate','Duplicate'), del=btn('Delete','Delete'); actions.append(up,down,dup,del); row.append(type, actions); card.appendChild(row);
      const prompt=document.createElement('input'); prompt.type='text'; prompt.className='toolbar-input ie-prompt'; prompt.placeholder='Question prompt'; prompt.value=q.prompt||''; card.appendChild(prompt);
      const area=document.createElement('div'); area.className='ie-choices';
      if(q.type==='MC'){
        q.options=q.options||[]; if(q.options.length<2) q.options=[{text:'',correct:false},{text:'',correct:false}];
        q.options.forEach((opt,i)=>{ const line=document.createElement('div'); line.className='ie-choice'; const chk=document.createElement('input'); chk.type='checkbox'; chk.checked=!!opt.correct; const txt=document.createElement('input'); txt.type='text'; txt.value=opt.text||''; txt.placeholder=`Option ${String.fromCharCode(65+i)}`; const rm=btn('✕','Remove option'); line.append(chk,txt,rm); area.appendChild(line); chk.addEventListener('change', ()=>{ opt.correct=!!chk.checked; syncToEditor(); renderSummary(); updateStatus(); }); txt.addEventListener('input', ()=>{ opt.text=txt.value; syncToEditor(); renderSummary(); updateStatus(); }); rm.addEventListener('click', ()=>{ q.options.splice(i,1); syncToEditor(); renderCards(); renderSummary(); }); });
        const addOpt=btn('Add option','Add option'); addOpt.addEventListener('click', ()=>{ if(q.options.length<8){ q.options.push({text:'',correct:false}); syncToEditor(); renderCards(); renderSummary(); } }); area.appendChild(addOpt);
      } else if(q.type==='MT'){
        q.left=Array.isArray(q.left)?q.left:[]; if(q.left.length===0) q.left=['',''];
        q.right=Array.isArray(q.right)?q.right:[]; if(q.right.length===0) q.right=['',''];
        if(!Array.isArray(q.pairs) || !q.pairs.length){ q.pairs=[[0,0]]; }
        else {
          q.pairs=q.pairs.map(pair=>{
            const li=parseInt(Array.isArray(pair)?pair[0]:0,10);
            const ri=parseInt(Array.isArray(pair)?pair[1]:0,10);
            const maxLeft=Math.max(q.left.length-1,0);
            const maxRight=Math.max(q.right.length-1,0);
            const safeLi=Number.isInteger(li)?Math.min(Math.max(li,0), maxLeft):0;
            const safeRi=Number.isInteger(ri)?Math.min(Math.max(ri,0), maxRight):0;
            return [safeLi,safeRi];
          });
        }
        const mtWrap=document.createElement('div'); mtWrap.className='ie-mt';
        const pairSelects=[];
        const setSelectOptions=(sel, options, selected)=>{
          const prev=selected!==undefined?String(selected):sel.value;
          sel.innerHTML='';
          options.forEach(opt=>{ const o=document.createElement('option'); o.value=opt.value; o.textContent=opt.label; sel.appendChild(o); });
          if(options.some(opt=>opt.value===String(prev))){ sel.value=String(prev); }
          else if(options.length){ sel.value=options[0].value; }
          else { sel.value=''; }
          return sel.value;
        };
        const refreshPairOptions=()=>{
          const leftOpts=q.left.map((text,i)=>({ value:String(i), label:`${i+1}) ${(String(text||'').trim())}`.trim() }));
          const rightOpts=q.right.map((text,i)=>({ value:String(i), label:`${String.fromCharCode(65+i)}) ${(String(text||'').trim())}`.trim() }));
          pairSelects.forEach(({ leftSel, rightSel, index })=>{
            const pair=q.pairs[index]; if(!pair) return;
            const leftVal=setSelectOptions(leftSel, leftOpts, pair[0]);
            const rightVal=setSelectOptions(rightSel, rightOpts, pair[1]);
            const li=parseInt(leftVal,10); if(Number.isInteger(li)) pair[0]=li;
            const ri=parseInt(rightVal,10); if(Number.isInteger(ri)) pair[1]=ri;
          });
        };

        const leftCol=document.createElement('div'); leftCol.className='ie-mt-col';
        const leftTitle=document.createElement('div'); leftTitle.className='ie-mt-title'; leftTitle.textContent='Left choices';
        leftCol.appendChild(leftTitle);
        q.left.forEach((text,i)=>{
          const line=document.createElement('div'); line.className='ie-mt-item';
          const label=document.createElement('span'); label.className='ie-mt-label'; label.textContent=`${i+1})`;
          const input=document.createElement('input'); input.type='text'; input.value=text||''; input.placeholder=`Left ${i+1}`;
          const remove=btn('✕','Remove left choice'); if(q.left.length<=1) remove.disabled=true;
          line.append(label,input,remove); leftCol.appendChild(line);
          input.addEventListener('input', ()=>{ q.left[i]=input.value; refreshPairOptions(); syncToEditor(); renderSummary(); updateStatus(); });
          remove.addEventListener('click', ()=>{ if(q.left.length<=1) return; q.left.splice(i,1); q.pairs=q.pairs.filter(([li])=>li!==i).map(([li,ri])=>[li>i?li-1:li, ri]); syncToEditor(); renderCards(); renderSummary(); });
        });
        const addLeft=btn('Add left','Add left choice'); addLeft.addEventListener('click', ()=>{ q.left.push(''); syncToEditor(); renderCards(); renderSummary(); }); leftCol.appendChild(addLeft);

        const rightCol=document.createElement('div'); rightCol.className='ie-mt-col';
        const rightTitle=document.createElement('div'); rightTitle.className='ie-mt-title'; rightTitle.textContent='Right choices';
        rightCol.appendChild(rightTitle);
        q.right.forEach((text,i)=>{
          const line=document.createElement('div'); line.className='ie-mt-item';
          const label=document.createElement('span'); label.className='ie-mt-label'; label.textContent=`${String.fromCharCode(65+i)})`;
          const input=document.createElement('input'); input.type='text'; input.value=text||''; input.placeholder=`Right ${String.fromCharCode(65+i)}`;
          const remove=btn('✕','Remove right choice'); if(q.right.length<=1) remove.disabled=true;
          line.append(label,input,remove); rightCol.appendChild(line);
          input.addEventListener('input', ()=>{ q.right[i]=input.value; refreshPairOptions(); syncToEditor(); renderSummary(); updateStatus(); });
          remove.addEventListener('click', ()=>{ if(q.right.length<=1) return; q.right.splice(i,1); q.pairs=q.pairs.filter(([_,ri])=>ri!==i).map(([li,ri])=>[li, ri>i?ri-1:ri]); syncToEditor(); renderCards(); renderSummary(); });
        });
        const addRight=btn('Add right','Add right choice'); addRight.addEventListener('click', ()=>{ q.right.push(''); syncToEditor(); renderCards(); renderSummary(); }); rightCol.appendChild(addRight);

        const pairsCol=document.createElement('div'); pairsCol.className='ie-mt-col ie-mt-pairs';
        const pairsTitle=document.createElement('div'); pairsTitle.className='ie-mt-title'; pairsTitle.textContent='Pairs';
        pairsCol.appendChild(pairsTitle);
        q.pairs.forEach((pair,pi)=>{
          if(!Array.isArray(pair)||pair.length<2) q.pairs[pi]=[0,0];
          const line=document.createElement('div'); line.className='ie-mt-item';
          const leftSel=document.createElement('select'); leftSel.className='ie-mt-select';
          const join=document.createElement('span'); join.className='ie-mt-join'; join.textContent='↔';
          const rightSel=document.createElement('select'); rightSel.className='ie-mt-select';
          const removePair=btn('✕','Remove pair');
          line.append(leftSel,join,rightSel,removePair); pairsCol.appendChild(line);
          pairSelects.push({ leftSel, rightSel, index:pi });
          leftSel.addEventListener('change', ()=>{ const val=parseInt(leftSel.value,10); q.pairs[pi][0]=Number.isInteger(val)?val:0; syncToEditor(); renderSummary(); updateStatus(); });
          rightSel.addEventListener('change', ()=>{ const val=parseInt(rightSel.value,10); q.pairs[pi][1]=Number.isInteger(val)?val:0; syncToEditor(); renderSummary(); updateStatus(); });
          removePair.addEventListener('click', ()=>{ q.pairs.splice(pi,1); if(!q.pairs.length) q.pairs=[[0,0]]; syncToEditor(); renderCards(); renderSummary(); });
        });
        const addPair=btn('Add pair','Add pair'); addPair.addEventListener('click', ()=>{ q.pairs.push([0,0]); syncToEditor(); renderCards(); renderSummary(); }); pairsCol.appendChild(addPair);

        mtWrap.append(leftCol,rightCol,pairsCol);
        area.appendChild(mtWrap);
        refreshPairOptions();
      } else {
        const line=document.createElement('div'); line.className='ie-choice'; const sel=document.createElement('select'); const opts=(q.type==='TF')?[['T','True'],['F','False']]:[['Y','Yes'],['N','No']]; opts.forEach(([v,l])=>{ const o=document.createElement('option'); o.value=v; o.textContent=l; sel.appendChild(o); }); sel.value = (q.type==='TF') ? (q.answer?'T':'F') : (q.answer?'Y':'N'); const lbl=document.createElement('span'); lbl.textContent='Correct'; line.append(sel,lbl); area.appendChild(line); sel.addEventListener('change', ()=>{ const v=sel.value; q.answer = (q.type==='TF') ? v==='T' : v==='Y'; syncToEditor(); renderSummary(); updateStatus(); });
      }
      card.appendChild(area);
      const status=document.createElement('div'); status.className = ok(q)?'ie-valid':'ie-error';
      const statusTextOk = 'Looks good';
      const updateStatus=()=>{
        const valid=ok(q);
        status.className = valid?'ie-valid':'ie-error';
        const statusTextBad = q.type==='MC' ? 'Incomplete — add text and mark a correct answer' : q.type==='MT' ? 'Incomplete — add prompt, matching choices, and pairs' : 'Incomplete — select the correct answer';
        status.textContent = valid?statusTextOk:statusTextBad;
      };
      updateStatus();
      card.appendChild(status);
      type.addEventListener('change', ()=>{
        const t=type.value;
        if(t==='MC'){
          q.type='MC';
          q.options=q.options&&q.options.length?q.options:[{text:'',correct:false},{text:'',correct:false}];
          delete q.answer; delete q.left; delete q.right; delete q.pairs;
        } else if(t==='TF' || t==='YN'){
          q.type=t;
          q.answer=false;
          q.options=[];
          delete q.left; delete q.right; delete q.pairs;
        } else if(t==='MT'){
          q.type='MT';
          delete q.answer; q.options=[];
          q.left=q.left&&q.left.length?q.left:['',''];
          q.right=q.right&&q.right.length?q.right:['',''];
          q.pairs=q.pairs&&q.pairs.length?q.pairs:[[0,0]];
        }
        syncToEditor(); renderCards(); renderSummary();
      });
      prompt.addEventListener('input', ()=>{ q.prompt=prompt.value; syncToEditor(); updateStatus(); renderSummary(); });
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
    ensureDocDelegation();
    const t=els().toggle; if(t){ t.checked = loadEnabled(); t.addEventListener('change', ()=> setEnabled(!!t.checked)); }
    setEnabled(loadEnabled());
    els().editor?.addEventListener('input', ()=>{ if(!state.enabled) return; syncFromEditor(); });
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
  return { init };
})();

export default IE2;
