'use strict';

const { validateQuizV2 } = require('./quizSchema.js');

const MC_RE = /^MC\|(.*)\|(.+?)\|([A-Za-z](?:\s*,\s*[A-Za-z])*)$/i;
const TF_RE = /^TF\|(.*)\|(T|F)$/i;
const YN_RE = /^YN\|(.*)\|(Y|N)$/i;
const MT_RE = /^MT\|(.*)\|(.+?)\|(.+?)\|(.+?)$/i;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function trimString(value){
  return value == null ? '' : String(value).trim();
}

function normalizeMc(raw){
  const m = raw.match(MC_RE);
  if(!m) return null;
  const text = trimString(m[1]);
  const optRaw = trimString(m[2]);
  const corrRaw = trimString(m[3]);
  const options = optRaw.split(';').map((s)=> trimString(s.replace(/^[A-D]\)\s*/i, ''))).filter(Boolean);
  const correct = corrRaw.split(',')
    .map((ch)=> trimString(ch).toUpperCase())
    .filter(Boolean)
    .map((ch)=> ch.charCodeAt(0) - 65)
    .filter((idx)=> Number.isInteger(idx) && idx >= 0 && idx < options.length);
  if(!text || options.length < 2 || correct.length === 0){
    return null;
  }
  const uniqueCorrect = Array.from(new Set(correct)).sort((a, b)=> a - b);
  return { type: 'MC', text, options, correct: uniqueCorrect };
}

function sanitizeMc(question){
  const options = Array.isArray(question.options)
    ? question.options.map((opt)=> trimString(opt)).filter(Boolean)
    : [];
  const correct = Array.isArray(question.correct)
    ? question.correct.filter((idx)=> Number.isInteger(idx) && idx >= 0 && idx < options.length)
    : [];
  if(!trimString(question.text) || options.length < 2 || correct.length === 0) return null;
  return {
    type: 'MC',
    text: trimString(question.text),
    options,
    correct: Array.from(new Set(correct)).sort((a, b)=> a - b),
  };
}

function normalizeTf(raw){
  const m = raw.match(TF_RE);
  if(!m) return null;
  const text = trimString(m[1]);
  const correct = trimString(m[2]).toUpperCase() === 'T';
  if(!text) return null;
  return { type: 'TF', text, correct };
}

function sanitizeTf(question){
  const text = trimString(question.text);
  if(!text || typeof question.correct !== 'boolean') return null;
  return { type: 'TF', text, correct: !!question.correct };
}

function normalizeYn(raw){
  const m = raw.match(YN_RE);
  if(!m) return null;
  const text = trimString(m[1]);
  const correct = trimString(m[2]).toUpperCase() === 'Y';
  if(!text) return null;
  return { type: 'YN', text, correct };
}

function sanitizeYn(question){
  const text = trimString(question.text);
  if(!text || typeof question.correct !== 'boolean') return null;
  return { type: 'YN', text, correct: !!question.correct };
}

function parsePairToken(token){
  const pieces = token.split('-').map((part)=> trimString(part));
  if(pieces.length !== 2) return null;
  const li = parseInt(pieces[0], 10) - 1;
  if(!Number.isInteger(li) || li < 0) return null;
  const letter = pieces[1].toUpperCase();
  if(!letter || LETTERS.indexOf(letter[0]) === -1) return null;
  const ri = LETTERS.indexOf(letter[0]);
  return [li, ri];
}

function normalizeMt(raw){
  const m = raw.match(MT_RE);
  if(!m) return null;
  const text = trimString(m[1]);
  const leftRaw = trimString(m[2]);
  const rightRaw = trimString(m[3]);
  const pairsRaw = trimString(m[4]);
  const left = leftRaw.split(';').map((s)=> trimString(s.replace(/^\d+\)\s*/, ''))).filter(Boolean);
  const right = rightRaw.split(';').map((s)=> trimString(s.replace(/^[A-Z]\)\s*/i, ''))).filter(Boolean);
  const pairs = pairsRaw.split(',')
    .map((token)=> parsePairToken(token))
    .filter((pair)=> Array.isArray(pair));
  if(!text || left.length === 0 || right.length === 0 || pairs.length === 0){
    return null;
  }
  const validPairs = [];
  const seen = new Set();
  pairs.forEach(([li, ri])=>{
    if(li < left.length && ri < right.length){
      const key = `${li}-${ri}`;
      if(!seen.has(key)){
        seen.add(key);
        validPairs.push([li, ri]);
      }
    }
  });
  if(validPairs.length === 0) return null;
  return { type: 'MT', text, left, right, pairs: validPairs };
}

function sanitizeMt(question){
  const text = trimString(question.text);
  const left = Array.isArray(question.left) ? question.left.map((item)=> trimString(item)).filter(Boolean) : [];
  const right = Array.isArray(question.right) ? question.right.map((item)=> trimString(item)).filter(Boolean) : [];
  const pairs = Array.isArray(question.pairs) ? question.pairs : [];
  const normalizedPairs = [];
  const seen = new Set();
  pairs.forEach((pair)=>{
    if(!Array.isArray(pair) || pair.length !== 2) return;
    const [li, ri] = pair;
    if(!Number.isInteger(li) || li < 0 || li >= left.length) return;
    if(!Number.isInteger(ri) || ri < 0 || ri >= right.length) return;
    const key = `${li}-${ri}`;
    if(seen.has(key)) return;
    seen.add(key);
    normalizedPairs.push([li, ri]);
  });
  if(!text || left.length === 0 || right.length === 0 || normalizedPairs.length !== left.length) return null;
  return { type: 'MT', text, left, right, pairs: normalizedPairs };
}

function toQuestion(line){
  if(MC_RE.test(line)) return normalizeMc(line);
  if(TF_RE.test(line)) return normalizeTf(line);
  if(YN_RE.test(line)) return normalizeYn(line);
  if(MT_RE.test(line)) return normalizeMt(line);
  return null;
}

function coerceQuestion(question){
  if(!question || typeof question !== 'object') return null;
  const type = trimString(question.type).toUpperCase();
  if(type === 'MC') return sanitizeMc(question);
  if(type === 'TF') return sanitizeTf(question);
  if(type === 'YN') return sanitizeYn(question);
  if(type === 'MT') return sanitizeMt(question);
  return null;
}

function normalizeLines(linesInput){
  if(!linesInput) return [];
  const lines = Array.isArray(linesInput)
    ? linesInput.map((l)=> trimString(l))
    : String(linesInput).split('\n').map((l)=> trimString(l));
  const filtered = lines
    .map((l)=> l.replace(/^\d+\.\s*/, ''))
    .filter((l)=> /^(MC|TF|YN|MT)\|/i.test(l));
  const questions = [];
  filtered.forEach((raw)=>{
    const q = toQuestion(raw);
    if(q) questions.push(q);
  });
  return questions;
}

function normalizeQuizV2(input){
  if(!input || typeof input !== 'object'){
    throw Object.assign(new Error('Quiz payload must be an object'), { code: 'ERR_INVALID_QUIZ' });
  }
  const title = trimString(input.title);
  const topic = trimString(input.topic);
  const questions = Array.isArray(input.questions) && input.questions.length
    ? input.questions.map((q)=> coerceQuestion(q)).filter(Boolean)
    : normalizeLines(input.lines || input.raw || '');

  const quiz = {
    version: 2,
    title,
    topic,
    questions,
  };

  const { valid, errors } = validateQuizV2(quiz);
  if(!valid){
    const err = new Error('Quiz failed validation');
    err.code = 'ERR_INVALID_QUIZ';
    err.details = errors;
    throw err;
  }

  return quiz;
}

function indexToLetter(idx){
  return LETTERS[idx] || '';
}

function toLegacyLines(quiz){
  const { valid, errors } = validateQuizV2(quiz || {});
  if(!valid){
    const err = new Error('Cannot convert quiz to legacy lines: invalid quiz');
    err.code = 'ERR_INVALID_QUIZ';
    err.details = errors;
    throw err;
  }

  return quiz.questions.map((q)=>{
    if(q.type === 'MC'){
      const opts = (q.options || []).map((opt, idx)=> `${indexToLetter(idx)}) ${opt}`);
      const corr = (q.correct || []).map(indexToLetter).filter(Boolean).join(',');
      return `MC|${q.text}|${opts.join(';')}|${corr}`;
    }
    if(q.type === 'TF'){
      return `TF|${q.text}|${q.correct ? 'T' : 'F'}`;
    }
    if(q.type === 'YN'){
      return `YN|${q.text}|${q.correct ? 'Y' : 'N'}`;
    }
    if(q.type === 'MT'){
      const left = (q.left || []).map((item, idx)=> `${idx+1}) ${item}`);
      const right = (q.right || []).map((item, idx)=> `${indexToLetter(idx)}) ${item}`);
      const pairs = (q.pairs || []).map(([li, ri])=> `${li+1}-${indexToLetter(ri)}`).join(',');
      return `MT|${q.text}|${left.join(';')}|${right.join(';')}|${pairs}`;
    }
    return '';
  }).filter(Boolean).join('\n');
}

module.exports = { normalizeQuizV2, toLegacyLines };
