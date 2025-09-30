'use strict';

const VALID_TYPES = ['MC', 'TF', 'YN', 'MT'];

function isString(value){
  return typeof value === 'string';
}

function isNonEmptyString(value){
  return isString(value) && value.trim().length > 0;
}

function ensureArray(value){
  return Array.isArray(value) ? value : [];
}

function validateQuizV2(quiz){
  const errors = [];
  if(!quiz || typeof quiz !== 'object'){
    errors.push('Quiz payload must be an object.');
    return { valid: false, errors };
  }

  const title = quiz.title;
  if(title != null && !isString(title)){
    errors.push('Quiz title must be a string when provided.');
  }

  const topic = quiz.topic;
  if(topic != null && !isString(topic)){
    errors.push('Quiz topic must be a string when provided.');
  }

  const questions = quiz.questions;
  if(!Array.isArray(questions) || questions.length === 0){
    errors.push('Quiz must include a non-empty questions array.');
    return { valid: false, errors };
  }

  questions.forEach((q, index)=>{
    const basePath = `Question ${index+1}`;
    if(!q || typeof q !== 'object'){
      errors.push(`${basePath}: must be an object.`);
      return;
    }

    if(!isNonEmptyString(q.text)){
      errors.push(`${basePath}: text is required.`);
    }

    const type = typeof q.type === 'string' ? q.type.toUpperCase() : '';
    if(!VALID_TYPES.includes(type)){
      errors.push(`${basePath}: invalid type.`);
      return;
    }

    if(type === 'MC'){
      const options = ensureArray(q.options);
      if(options.length < 2){
        errors.push(`${basePath}: multiple choice questions require at least two options.`);
      }
      options.forEach((opt, i)=>{
        if(!isNonEmptyString(opt)){
          errors.push(`${basePath}: option ${i+1} must be a non-empty string.`);
        }
      });
      const correct = ensureArray(q.correct);
      if(correct.length === 0){
        errors.push(`${basePath}: correct answers must include at least one index.`);
      } else {
        correct.forEach((idx)=>{
          if(!Number.isInteger(idx) || idx < 0 || idx >= options.length){
            errors.push(`${basePath}: correct answer index out of range.`);
          }
        });
      }
    } else if(type === 'TF' || type === 'YN'){
      if(typeof q.correct !== 'boolean'){
        errors.push(`${basePath}: correct must be a boolean.`);
      }
    } else if(type === 'MT'){
      const left = ensureArray(q.left);
      const right = ensureArray(q.right);
      const pairs = ensureArray(q.pairs);

      if(left.length === 0){
        errors.push(`${basePath}: matching questions require left choices.`);
      }
      if(right.length === 0){
        errors.push(`${basePath}: matching questions require right choices.`);
      }

      left.forEach((item, i)=>{
        if(!isNonEmptyString(item)){
          errors.push(`${basePath}: left item ${i+1} must be a non-empty string.`);
        }
      });

      right.forEach((item, i)=>{
        if(!isNonEmptyString(item)){
          errors.push(`${basePath}: right item ${String.fromCharCode(65+i)} must be a non-empty string.`);
        }
      });

      if(pairs.length === 0){
        errors.push(`${basePath}: matching questions require answer pairs.`);
      }
      const leftSeen = new Set();
      const rightSeen = new Set();
      pairs.forEach((pair)=>{
        if(!Array.isArray(pair) || pair.length !== 2){
          errors.push(`${basePath}: each pair must contain a left and right index.`);
          return;
        }
        const [li, ri] = pair;
        if(!Number.isInteger(li) || li < 0 || li >= left.length){
          errors.push(`${basePath}: left index ${li} is out of range.`);
        }
        if(!Number.isInteger(ri) || ri < 0 || ri >= right.length){
          errors.push(`${basePath}: right index ${ri} is out of range.`);
        }
        if(Number.isInteger(li) && li >= 0 && li < left.length){
          if(leftSeen.has(li)){
            errors.push(`${basePath}: left item ${li+1} mapped more than once.`);
          }
          leftSeen.add(li);
        }
        if(Number.isInteger(ri) && ri >= 0 && ri < right.length){
          if(rightSeen.has(ri)){
            errors.push(`${basePath}: right item ${String.fromCharCode(65+ri)} mapped more than once.`);
          }
          rightSeen.add(ri);
        }
      });
      if(pairs.length !== left.length){
        errors.push(`${basePath}: number of pairs must match left choices.`);
      }
      for(let i=0;i<left.length;i++){
        if(!leftSeen.has(i)){
          errors.push(`${basePath}: left item ${i+1} is not matched.`);
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

module.exports = { validateQuizV2 };
