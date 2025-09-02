/* EZ-Quiz: App (generator-first)
   - Primary flow: Topic + Length + Difficulty → Generate → auto-start quiz (JSON path)
   - Manual editor hidden by default; opened via Manual ▾
*/

(function () {
  // ---------- Utils ----------
  function escapeHTML(s){ return String(s).replace(/[&<>\"]/g,m=>({ "&":"&amp;", "<":"&lt;", ">":