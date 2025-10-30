// Early beta gating without inline script (CSP-safe)
// Sets body[data-beta] based on FEATURE_FLAGS cookie at first paint
(function(){
  try{
    var m = document.cookie.match(/(?:^|;\s*)FEATURE_FLAGS=([^;]+)/);
    if(!m) return;
    var flags = decodeURIComponent(m[1]||'');
    var list = flags.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    if(list.indexOf('beta') !== -1){ document.addEventListener('DOMContentLoaded', function(){ try{ document.body.setAttribute('data-beta',''); }catch{} }); }
  }catch{}
})();

