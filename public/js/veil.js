export const MESSAGES = [
  'Sharpening pencils…',
  'Arguing about the correct answer… politely.',
  'Counting to four. Repeatedly.',
  'Shuffling options without dropping any.',
  'Checking for trick questions…',
  'Teaching the quiz to behave.',
  'Wrangling multiple choices…',
];
let veilTimer = null;
export function showVeil(startAt=0){
  const veil = document.getElementById('veil');
  const msg  = document.getElementById('veilMsg');
  const panel = veil?.querySelector('.veil__panel');
  const spinner = veil?.querySelector('.spinner');
  if (!veil || !msg) return;
  panel?.classList.remove('is-done');
  if(spinner) spinner.style.display = '';
  let i = startAt % MESSAGES.length;
  msg.textContent = MESSAGES[i++];
  veil.hidden = false;
  try { document.body && document.body.setAttribute('data-busy', 'true'); } catch {}
  veilTimer = setInterval(()=>{ msg.textContent = MESSAGES[i++ % MESSAGES.length]; }, 7200);
}
export function hideVeil(doneText){
  const veil = document.getElementById('veil');
  const msg  = document.getElementById('veilMsg');
  const panel = veil?.querySelector('.veil__panel');
  const spinner = veil?.querySelector('.spinner');
  if (veilTimer) { clearInterval(veilTimer); veilTimer = null; }
  if (msg && doneText){
    msg.textContent = String(doneText).trim();
    panel?.classList.add('is-done');
    if(spinner) spinner.style.display = 'none';
  }
  setTimeout(()=>{
    if (veil) veil.hidden = true;
    try { document.body && document.body.removeAttribute('data-busy'); } catch {}
  }, 250);
}
