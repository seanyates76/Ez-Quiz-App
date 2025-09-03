(function () {
  // ---------- Utilities ----------
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const escapeHTML = (s) =>
    String(s).replace(/[&<"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[m]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n) || 0));

  const formatTime = (ms) => {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const min = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const sec = String(totalSec % 60).padStart(2, "0");
    return `${min}:${sec}`;
  };

  // ---------- Global State ----------
  window.__EZQ__ = {
    mode: "idle", // 'idle' | 'quiz' | 'results'
    quiz: { questions: [], index: 0, answers: [], score: 0, startedAt: 0, finishedAt: 0 },
    settings: { timerEnabled: false, countdown: false, durationMs: 0 },
    _timer: { id: 0, endAt: 0, display: null }
  };

  // ---------- Modal handling ----------
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.removeAttribute("hidden");
    const first = qs('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal);
    if (first && typeof first.focus === "function") first.focus();
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("hidden", "");
  }
  function wireModal(openBtn, modal, closeBtn) {
    if (!modal) return () => {};
    let opener = null;
    const onOpen = (e) => { opener = e.currentTarget; openModal(modal); };
    const onClose = () => {
      closeModal(modal);
      if (opener && document.contains(opener) && typeof opener.focus === "function") opener.focus();
    };
    if (openBtn) openBtn.addEventListener("click", onOpen);
    if (closeBtn) closeBtn.addEventListener("click", onClose);
    const backdrop = qs(".modal-backdrop", modal);
    if (backdrop) backdrop.addEventListener("click", onClose);
    return onClose;
  }

  // ---------- Editor input parser (from Phase 2) ----------
  function parseEditorInput(text) {
    const questions = [];
    const errors = [];
    const lines = String(text).split("\n").map(s => s.trim()).filter(Boolean);

    const letterToIndex = (ch) => {
      const c = String(ch || "").trim().toUpperCase();
      if (!c || c.length !== 1) return NaN;
      return c.charCodeAt(0) - 65; // A=0
    };

    lines.forEach((line, i) => {
      const lineNum = i + 1;
      const parts = line.split("|").map(s => s.trim());
      const type = (parts[0] || "").toUpperCase();
      try {
        switch (type) {
          case "MC": {
            if (parts.length !== 4) throw new Error("MC requires 4 parts: MC|Text|Options|Answer");
            const [, qtext, optionsStr, answerStr] = parts;
            const options = optionsStr
              .split(";")
              .map(s => s.trim().replace(/^[A-F]\)\s*/i, ""))
              .filter(Boolean);
            if (options.length < 2 || options.length > 6) throw new Error("MC must have 2–6 options.");
            const correctIndices = (answerStr || "")
              .split(",")
              .map(letterToIndex);
            if (correctIndices.some(isNaN)) throw new Error("Invalid MC answer letters.");
            if (correctIndices.some(n => n < 0 || n >= options.length)) {
              throw new Error("MC answers must match existing options.");
            }
            const uniqueSorted = [...new Set(correctIndices)].sort((a, b) => a - b);
            questions.push({ type: "MC", text: qtext, options, correct: uniqueSorted });
            break;
          }
          case "TF":
          case "YN": {
            if (parts.length !== 3) throw new Error(`${type} requires 3 parts: ${type}|Text|Answer`);
            const [, qtext, answerStr] = parts;
            const ans = String(answerStr || "").trim().toUpperCase();
            if (type === "TF" && !["T", "F"].includes(ans)) throw new Error("TF must be T or F.");
            if (type === "YN" && !["Y", "N"].includes(ans)) throw new Error("YN must be Y or N.");
            questions.push({ type, text: qtext, correct: ans === "T" || ans === "Y" });
            break;
          }
          case "MT": {
            if (parts.length !== 5) throw new Error("MT requires 5 parts: MT|Prompt|Left|Right|Pairs");
            const [, qtext, leftStr, rightStr, pairsStr] = parts;
            const left = leftStr.split(";").map(s => s.trim().replace(/^\d+\)\s*/, "")).filter(Boolean);
            const right = rightStr.split(";").map(s => s.trim().replace(/^[A-Z]\)\s*/i, "")).filter(Boolean);
            if (!left.length || !right.length) throw new Error("MT needs items on both sides.");
            const pairs = pairsStr.split(",").map(p => {
              const [l, r] = p.trim().split("-");
              const lIndex = parseInt(l, 10) - 1;
              const rIndex = letterToIndex(r);
              if (isNaN(lIndex) || isNaN(rIndex) || lIndex < 0 || lIndex >= left.length || rIndex < 0 || rIndex >= right.length) {
                throw new Error(`Invalid MT pair "${p}"`);
              }
              return [lIndex, rIndex];
            });
            questions.push({ type: "MT", text: qtext, left, right, pairs });
            break;
          }
          default:
            throw new Error(`Unknown type "${type}". Use MC, TF, YN, or MT.`);
        }
      } catch (e) {
        errors.push(`Line ${lineNum}: ${e.message || e}`);
      }
    });

    return { questions, errors };
  }

  // ---------- Timer ----------
  function tick() {
    const S = window.__EZQ__;
    if (!S._timer.display) return;
    if (S.settings.countdown) {
      const remaining = S._timer.endAt - Date.now();
      if (remaining <= 0) {
        finishQuiz();
        return;
      }
      S._timer.display.textContent = formatTime(remaining);
    } else {
      S._timer.display.textContent = formatTime(Date.now() - S.quiz.startedAt);
    }
  }
  function startTimer() {
    const S = window.__EZQ__;
    stopTimer();
    if (S.settings.timerEnabled) {
      if (S.settings.countdown) S._timer.endAt = Date.now() + S.settings.durationMs;
      S._timer.id = setInterval(tick, 1000);
      tick();
    }
  }
  function stopTimer() {
    const S = window.__EZQ__;
    if (S._timer.id) clearInterval(S._timer.id);
    S._timer.id = 0;
  }

  // ---------- UI Mode ----------
  function enterQuizMode() {
    document.body.classList.add("is-quiz");
    const gen = $("#generatorCard"); if (gen) gen.hidden = true;
    const adv = $("#manualMenu");    if (adv) adv.hidden = true;
    const qv = $("#quizView");       if (qv) qv.hidden = false;
    window.__EZQ__.mode = "quiz";
  }
  function exitToMenu() {
    stopTimer();
    document.body.classList.remove("is-quiz");
    const gen = $("#generatorCard"); if (gen) gen.hidden = false;
    const adv = $("#manualMenu");    if (adv) adv.hidden = false;
    const qv = $("#quizView");       if (qv) { qv.hidden = true; qv.innerHTML = ""; }
    const rv = $("#resultsView");    if (rv) { rv.hidden = true; rv.innerHTML = ""; }
    window.__EZQ__.mode = "idle";
  }

  // ---------- Quiz Runner ----------
  function renderCurrentQuestion() {
    const S = window.__EZQ__;
    const q = S.quiz.questions[S.quiz.index];
    const view = $("#quizView");
    if (!q || !view) return;

    let html = `
      <h2>Question ${S.quiz.index + 1} of ${S.quiz.questions.length}</h2>
      <p class="q">${escapeHTML(q.text || "")}</p>
    `;

    const ans = S.quiz.answers[S.quiz.index];

    if (q.type === "MC") {
      const isMulti = (q.correct || []).length > 1;
      html += `<div class="opts">`;
      (q.options || []).forEach((opt, i) => {
        const checked = isMulti ? Array.isArray(ans) && ans.includes(i) : ans === i;
        const type = isMulti ? "checkbox" : "radio";
        const name = "mc_opt_" + S.quiz.index;
        html += `
          <label>
            <input type="${type}" name="${name}" value="${i}" ${checked ? "checked" : ""}>
            ${escapeHTML(opt || "")}
          </label>
        `;
      });
      html += `</div>`;
    }

    if (q.type === "TF" || q.type === "YN") {
      const opts = q.type === "TF" ? [["true","True"],["false","False"]] : [["true","Yes"],["false","No"]];
      const name = "tfyn_opt_" + S.quiz.index;
      html += `<div class="opts">`;
      opts.forEach(([val,label]) => {
        const checked = String(ans) === val;
        html += `
          <label>
            <input type="radio" name="${name}" value="${val}" ${checked ? "checked" : ""}>
            ${label}
          </label>
        `;
      });
      html += `</div>`;
    }

    if (q.type === "MT") {
      html += `<div class="match-grid">`;
      (q.left || []).forEach((leftItem, i) => {
        html += `<div class="match-row">`;
        html += `<span class="match-left">${i + 1}) ${escapeHTML(leftItem || "")}<
        <select data-l-index="${i}">
          <option value="-1">Select…</option>`;
        (q.right || []).forEach((rightItem, j) => {
          const selectedJ = Array.isArray(ans) ? (ans.find(p => p[0] === i)?.[1]) : -1;
          html += `<option value="${j}" ${selectedJ === j ? "selected" : ""}>
            ${String.fromCharCode(65 + j)}) ${escapeHTML(rightItem || "")}
          </option>`;
        });
        html += `</select></div>`;
      });
      html += `</div>`;
    }

    html += `
      <div class="quiz-nav row">
        <button id="prevBtn" class="btn" ${S.quiz.index === 0 ? "disabled" : ""}>Previous</button>
        <span id="timerDisplay" class="hint"></span>
        <button id="nextBtn" class="btn" ${S.quiz.index === S.quiz.questions.length - 1 ? "disabled" : ""}>Next</button>
        <button id="finishBtn" class="btn primary">Finish</button>
      </div>
    `;

    view.innerHTML = html;
    window.__EZQ__._timer.display = $("#timerDisplay");

    // Persist answers on change
    view.addEventListener("change", () => {
      const S = window.__EZQ__;
      const q = S.quiz.questions[S.quiz.index];
      if (!q) return;
      if (q.type === "MC") {
        const isMulti = (q.correct || []).length > 1;
        if (isMulti) {
          S.quiz.answers[S.quiz.index] = qsa("input[type=checkbox]:checked", view).map(el => Number(el.value));
        } else {
          const picked = qs("input[type=radio]:checked", view);
          S.quiz.answers[S.quiz.index] = picked ? Number(picked.value) : undefined;
        }
      } else if (q.type === "TF" || q.type === "YN") {
        const picked = qs("input[type=radio]:checked", view);
        S.quiz.answers[S.quiz.index] = picked ? (picked.value === "true") : undefined;
      } else if (q.type === "MT") {
        S.quiz.answers[S.quiz.index] = qsa("select", view)
          .map(sel => [Number(sel.dataset.lIndex), Number(sel.value)])
          .filter(p => p[1] !== -1);
      }
    }, { once: true });

    $("#prevBtn")?.addEventListener("click", () => {
      const S = window.__EZQ__;
      if (S.quiz.index > 0) {
        S.quiz.index--;
        renderCurrentQuestion();
      }
    });
    $("#nextBtn")?.addEventListener("click", () => {
      const S = window.__EZQ__;
      if (S.quiz.index < S.quiz.questions.length - 1) {
        S.quiz.index++;
        renderCurrentQuestion();
      }
    });
    $("#finishBtn")?.addEventListener("click", finishQuiz);
  }

  function calculateScore() {
    const S = window.__EZQ__;
    let score = 0;
    S.quiz.questions.forEach((q, i) => {
      const userAns = S.quiz.answers[i];
      let ok = false;
      if (q.type === "MC") {
        const correct = Array.isArray(q.correct) ? q.correct.slice().sort() : [];
        const ua = Array.isArray(userAns) ? userAns.slice().sort() : (typeof userAns === "number" ? [userAns] : []);
        ok = correct.length === ua.length && correct.every((c, idx) => c === ua[idx]);
      } else if (q.type === "TF" || q.type === "YN") {
        ok = !!q.correct === !!userAns;
      } else if (q.type === "MT") {
        const upairs = Array.isArray(userAns) ? userAns : [];
        const correctPairs = Array.isArray(q.pairs) ? q.pairs : [];
        if (upairs.length === correctPairs.length) {
          ok = upairs.every(([l, r]) => correctPairs.some(p => p[0] === l && p[1] === r));
        }
      }
      if (ok) score++;
    });
    S.quiz.score = score;
  }

  function finishQuiz() {
    const S = window.__EZQ__;
    stopTimer();
    S.quiz.finishedAt = Date.now();
    calculateScore();
    S.mode = "results";

    const qv = $("#quizView"); if (qv) qv.hidden = true;
    const rv = $("#resultsView"); if (!rv) return;
    rv.hidden = false;

    const timeStr = formatTime(S.quiz.finishedAt - S.quiz.startedAt);
    rv.innerHTML = `
      <h2>Quiz Complete!</h2>
      <p>Score: ${S.quiz.score} / ${S.quiz.questions.length}</p>
      <p>Time: ${timeStr}</p>
      <div class="row">
        <button id="retakeBtn" class="btn">Retake</button>
        <button id="newQuizBtn" class="btn primary">New Quiz</button>
      </div>
    `;

    $("#retakeBtn")?.addEventListener("click", () => {
      rv.hidden = true;
      // reset run state but keep same questions & settings
      S.mode = "quiz";
      S.quiz.index = 0;
      S.quiz.answers = new Array(S.quiz.questions.length);
      S.quiz.score = 0;
      S.quiz.startedAt = Date.now();
      S.quiz.finishedAt = 0;
      enterQuizMode();
      renderCurrentQuestion();
      if (S.settings.timerEnabled) startTimer();
    });
    $("#newQuizBtn")?.addEventListener("click", exitToMenu);
  }

  function startQuiz(questions) {
    const S = window.__EZQ__;
    // normalize minimal structure already ensured by parser
    S.mode = "quiz";
    S.quiz = {
      questions: Array.isArray(questions) ? questions : [],
      index: 0,
      answers: new Array(Array.isArray(questions) ? questions.length : 0),
      score: 0,
      startedAt: Date.now(),
      finishedAt: 0
    };

    // Read settings
    const enabled = $("#timerEnabled")?.checked;
    const countdown = $("#countdownMode")?.checked;
    const durStr = $("#timerDuration")?.value || "05:00";
    const [mm, ss] = durStr.split(":").map(v => clamp(parseInt(v, 10), 0, 5999));
    const durationMs = ((mm || 0) * 60 + (ss || 0)) * 1000;

    S.settings.timerEnabled = !!enabled;
    S.settings.countdown = !!countdown;
    S.settings.durationMs = durationMs;

    enterQuizMode();
    renderCurrentQuestion();
    if (S.settings.timerEnabled) startTimer();
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    // Modals
    const helpBtn = $("#helpBtn"), settingsBtn = $("#settingsBtn");
    const helpModal = $("#helpModal"), settingsModal = $("#settingsModal");
    const helpClose = $("#helpClose"), settingsClose = $("#settingsClose");
    const resetAppBtn = $("#resetApp");

    const closeHelp = wireModal(helpBtn, helpModal, helpClose);
    const closeSettings = wireModal(settingsBtn, settingsModal, settingsClose);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (helpModal?.classList.contains("is-open")) closeHelp?.();
        if (settingsModal?.classList.contains("is-open")) closeSettings?.();
      }
    });

    if (resetAppBtn) {
      resetAppBtn.addEventListener("click", () => {
        try { localStorage.clear(); } catch {}
        location.reload();
      });
    }

    // Editor parser → Start Quiz (Phase 3 entry point)
    const startQuizBtn = $("#startQuiz");
    const quizInput = $("#quizInput");
    const editorPane = $("#editorPane");

    if (startQuizBtn && quizInput && editorPane) {
      let errorContainer = $("#parseErrors");
      if (!errorContainer) {
        errorContainer = document.createElement("div");
        errorContainer.id = "parseErrors";
        errorContainer.className = "parse-errors";
        const host = editorPane.querySelector(".editor") || editorPane;
        host.appendChild(errorContainer);
      }

      startQuizBtn.addEventListener("click", () => {
        const { questions, errors } = parseEditorInput(quizInput.value || "");
        errorContainer.innerHTML = errors.length
          ? `<ul>${errors.slice(0, 5).map(e => `<li>${escapeHTML(e)}</li>`).join("")}</ul`
          : "";

        const statusEl = $("#quickStatus");
        if (!questions.length || errors.length) {
          if (statusEl) statusEl.textContent = errors.length ? "Parsing failed." : "No questions found.";
          return;
        }
        if (statusEl) {
          const counts = questions.reduce((acc, q) => { acc[q.type] = (acc[q.type] || 0) + 1; return acc; }, {});
          const parts = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ");
          statusEl.textContent = `Parsed ${questions.length} questions (${parts}).`;
        }
        startQuiz(questions);
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // ignore while typing in inputs
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT" || active.isContentEditable)) {
        return;
      }
      const S = window.__EZQ__;
      if (S.mode === "quiz") {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          finishQuiz();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (S.quiz.index === S.quiz.questions.length - 1) finishQuiz();
          else { S.quiz.index++; renderCurrentQuestion(); }
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          if (S.quiz.index > 0) { S.quiz.index--; renderCurrentQuestion(); }
          return;
        }
      }
    });
  });
})();
