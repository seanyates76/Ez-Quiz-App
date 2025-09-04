export const S = (window.EZQ = window.EZQ || {});
S.mode = S.mode || 'idle';
S.quiz = S.quiz || { questions: [], index: 0, answers: [], score: 0, startedAt: 0, finishedAt: 0, endAt: 0, topic: '', title: '' };
S.settings = S.settings || { theme: 'dark', timerEnabled: false, countdown: false, durationMs: 0, autoStart: true, requireAnswer: false };

export const STORAGE_KEYS = { theme: 'ezq.theme', settings: 'ezq.settings' };

