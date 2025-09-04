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
  if (!veil || !msg) return;
  let i = startAt % MESSAGES.length;
  msg.textContent = MESSAGES[i++];
  veil.hidden = false;
  veilTimer = setInterval(()=>{ msg.textContent = MESSAGES[i++ % MESSAGES.length]; }, 7200);
}
export function hideVeil(doneText){
  const veil = document.getElementById('veil');
  const msg  = document.getElementById('veilMsg');
  if (veilTimer) { clearInterval(veilTimer); veilTimer = null; }
  if (msg && doneText) msg.textContent = doneText;
  setTimeout(()=>{ if (veil) veil.hidden = true; }, 250);
}

