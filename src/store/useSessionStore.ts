import { create } from 'zustand';
import type { Question, QuestionType } from '../types/config';
import type { LoadedSubject } from '../lib/configLoader';
import { gradeQuestion, type GradingContext } from '../lib/grading';
import {
  aggregateMastery,
  createInitialProgress,
  isDue,
  updateProgress,
  type Progress,
} from '../lib/srs';
import { appendSession, loadProgress, loadQuestionOverrides, saveProgress, type SessionSummary } from '../lib/storage';
import { applyQuestionOverride } from '../lib/questionOverrides';
import { shuffle } from '../lib/shuffle';

export type SessionMode = 'practice' | 'exam' | 'mistakes' | 'srs' | 'mix' | 'topic' | 'speed';

export interface SessionFilters {
  subjectIds: string[];
  topics?: string[];
  types?: QuestionType[];
  difficulties?: number[];
  tags?: string[];
  examLength?: number | 'all';
}

export interface AnsweredQuestion {
  question: Question;
  subjectId: string;
  answer: unknown;
  revealed: boolean;
  grade: number | null;
  isCorrect: boolean | null;
  fraction: number | null;
  timeMs: number;
  skipped: boolean;
  usedHint: boolean;
  startedAt: number;
}

interface SessionState {
  active: boolean;
  mode: SessionMode | null;
  subjectId: string | null;
  items: AnsweredQuestion[];
  currentIndex: number;
  sessionStartedAt: number;
  examDeadline: number | null; // epoch ms; null when not exam mode
  examDurationMs: number;
  speedDeadline: number | null; // epoch ms for current question in speed mode
  speedDurationMs: number;
  streak: number;
  emptyReason: string | null;

  startSession: (subjects: LoadedSubject[], mode: SessionMode, filters: SessionFilters) => void;
  setAnswer: (answer: unknown) => void;
  reveal: () => void;
  next: () => void;
  skip: () => void;
  finish: () => void;
  reset: () => void;
  retryMistakes: (subjects: LoadedSubject[]) => void;
}

const SRS_SESSION_CAP = 30;
export const EXAM_DURATION_PER_QUESTION_MS = 60_000; // 60s/question budget for exam timer
export const SPEED_QUESTION_MS = 15_000;

function questionMatchesFilters(q: Question, filters: SessionFilters): boolean {
  if (filters.topics && filters.topics.length > 0 && !filters.topics.includes(q.topic)) return false;
  if (filters.types && filters.types.length > 0 && !filters.types.includes(q.type)) return false;
  if (filters.difficulties && filters.difficulties.length > 0) {
    const diff = q.difficulty ?? 1;
    if (!filters.difficulties.includes(diff)) return false;
  }
  if (filters.tags && filters.tags.length > 0) {
    const tags = q.tags ?? [];
    if (!filters.tags.some((t) => tags.includes(t))) return false;
  }
  return true;
}

function buildPool(
  subjects: LoadedSubject[],
  mode: SessionMode,
  filters: SessionFilters,
  progressMap: Record<string, Progress>,
): { pool: { question: Question; subjectId: string }[]; emptyReason: string | null } {
  // Use only top-level questions (subj.config.questions) - flattened passage sub-questions
  // are presented exclusively inside their parent passage, never standalone, and never
  // tracked individually in SM-2 progress (only the passage parent id is).
  const all: { question: Question; subjectId: string }[] = [];
  const topLevel: { question: Question; subjectId: string }[] = [];
  for (const subj of subjects) {
    if (!filters.subjectIds.includes(subj.ref.id)) continue;
    for (const q of subj.config.questions) {
      if (!questionMatchesFilters(q, filters)) continue;
      if (q.type === 'passage') topLevel.push({ question: q, subjectId: subj.ref.id });
      else all.push({ question: q, subjectId: subj.ref.id });
    }
  }

  switch (mode) {
    case 'mistakes': {
      const pool = all.filter(({ question }) => {
        const p = progressMap[question.id];
        if (!p || p.totalSeen === 0) return false;
        return p.mastery < 40;
      });
      if (pool.length === 0) {
        return { pool: [], emptyReason: 'Zatím nemáte žádné chybované otázky k opakování. Skvělá práce!' };
      }
      return { pool: shuffle(pool), emptyReason: null };
    }
    case 'srs': {
      const due = all.filter(({ question }) => isDue(progressMap[question.id]));
      due.sort((a, b) => {
        const pa = progressMap[a.question.id];
        const pb = progressMap[b.question.id];
        const dueA = pa?.totalSeen ? pa.due : 0; // unseen sort first within "most overdue"
        const dueB = pb?.totalSeen ? pb.due : 0;
        return dueA - dueB;
      });
      if (due.length === 0) {
        return { pool: [], emptyReason: 'Žádné otázky nejsou aktuálně na řadě k opakování. Vraťte se později!' };
      }
      return { pool: due.slice(0, SRS_SESSION_CAP), emptyReason: null };
    }
    case 'mix': {
      const combined = [...all, ...topLevel];
      return { pool: shuffle(combined), emptyReason: combined.length === 0 ? 'Žádné otázky neodpovídají zvoleným filtrům.' : null };
    }
    case 'topic': {
      const combined = [...all, ...topLevel];
      return { pool: shuffle(combined), emptyReason: combined.length === 0 ? 'Pro vybrané téma nejsou žádné otázky.' : null };
    }
    case 'exam': {
      const combined = shuffle([...all, ...topLevel]);
      const len = filters.examLength;
      const sliced = len === 'all' || !len ? combined : combined.slice(0, len);
      return { pool: sliced, emptyReason: sliced.length === 0 ? 'Žádné otázky neodpovídají zvoleným filtrům.' : null };
    }
    case 'speed':
    case 'practice':
    default: {
      const combined = shuffle([...all, ...topLevel]);
      return { pool: combined, emptyReason: combined.length === 0 ? 'Žádné otázky neodpovídají zvoleným filtrům.' : null };
    }
  }
}

function makeAnsweredQuestion(question: Question, subjectId: string): AnsweredQuestion {
  // Apply any user-saved correction (see SettingsGearMenu / QuizPage editor) so the
  // learner's fix is reflected both in grading and in the "correct answer" explanation.
  const overrides = loadQuestionOverrides();
  const effectiveQuestion = applyQuestionOverride(question, overrides[question.id]);
  return {
    question: effectiveQuestion,
    subjectId,
    answer: question.type === 'multiple' || question.type === 'ordering' ? [] : question.type === 'gap' || question.type === 'passage' ? [] : question.type === 'matching' || question.type === 'categorize' ? {} : question.type === 'truefalse' || question.type === 'single' ? null : '',
    revealed: false,
    grade: null,
    isCorrect: null,
    fraction: null,
    timeMs: 0,
    skipped: false,
    usedHint: false,
    startedAt: Date.now(),
  };
}

function gradeItem(item: AnsweredQuestion, ctx: GradingContext): { grade: number; isCorrect: boolean; fraction: number } {
  if (item.question.type === 'passage') {
    const subQuestions = item.question.questions;
    const answers = (item.answer as unknown[]) ?? [];
    const grades: number[] = [];
    let correctCount = 0;
    subQuestions.forEach((sub, i) => {
      const fullQ = { ...sub, id: `${item.question.id}-sub-${i}`, topic: item.question.topic } as Question;
      const outcome = gradeQuestion(fullQ, answers[i], ctx);
      grades.push(outcome.grade);
      if (outcome.isCorrect) correctCount += 1;
    });
    const avgGrade = grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : 0;
    return { grade: avgGrade, isCorrect: correctCount === subQuestions.length, fraction: subQuestions.length > 0 ? correctCount / subQuestions.length : 0 };
  }
  const outcome = gradeQuestion(item.question, item.answer, ctx);
  return outcome;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  active: false,
  mode: null,
  subjectId: null,
  items: [],
  currentIndex: 0,
  sessionStartedAt: 0,
  examDeadline: null,
  examDurationMs: 0,
  speedDeadline: null,
  speedDurationMs: SPEED_QUESTION_MS,
  streak: 0,
  emptyReason: null,

  startSession: (subjects, mode, filters) => {
    const progressMap = loadProgress();
    const { pool, emptyReason } = buildPool(subjects, mode, filters, progressMap);
    if (pool.length === 0) {
      set({ active: false, emptyReason, mode, items: [] });
      return;
    }
    const items = pool.map(({ question, subjectId }) => makeAnsweredQuestion(question, subjectId));
    const now = Date.now();
    const examDurationMs = mode === 'exam' ? items.length * EXAM_DURATION_PER_QUESTION_MS : 0;
    set({
      active: true,
      mode,
      subjectId: filters.subjectIds[0] ?? null,
      items,
      currentIndex: 0,
      sessionStartedAt: now,
      examDeadline: mode === 'exam' ? now + examDurationMs : null,
      examDurationMs,
      speedDeadline: mode === 'speed' ? now + SPEED_QUESTION_MS : null,
      speedDurationMs: SPEED_QUESTION_MS,
      streak: 0,
      emptyReason: null,
    });
  },

  setAnswer: (answer) => {
    const { items, currentIndex } = get();
    if (currentIndex >= items.length) return;
    const next = [...items];
    next[currentIndex] = { ...next[currentIndex], answer };
    set({ items: next });
  },

  reveal: () => {
    const { items, currentIndex, mode } = get();
    if (currentIndex >= items.length) return;
    const item = items[currentIndex];
    if (item.revealed) return;
    const timeMs = Date.now() - item.startedAt;
    const ctx: GradingContext = { timeMs, usedHint: item.usedHint, skipped: item.skipped };
    const { grade, isCorrect, fraction } = gradeItem(item, ctx);

    const next = [...items];
    next[currentIndex] = { ...item, revealed: true, grade, isCorrect, fraction, timeMs };
    let streak = get().streak;
    if (mode === 'speed') {
      streak = isCorrect ? streak + 1 : 0;
    }
    set({ items: next, streak });

    // Update SM-2 progress immediately for all modes except exam (updated at results time)
    if (mode !== 'exam') {
      const progressMap = loadProgress();
      const prev = progressMap[item.question.id] ?? createInitialProgress();
      progressMap[item.question.id] = updateProgress(prev, grade, Date.now());
      saveProgress(progressMap);
    }
  },

  next: () => {
    const { currentIndex, items } = get();
    if (currentIndex < items.length - 1) {
      const newIndex = currentIndex + 1;
      const next = [...items];
      next[newIndex] = { ...next[newIndex], startedAt: Date.now() };
      set({
        currentIndex: newIndex,
        items: next,
        speedDeadline: get().mode === 'speed' ? Date.now() + SPEED_QUESTION_MS : null,
      });
    } else {
      get().finish();
    }
  },

  skip: () => {
    const { items, currentIndex, mode } = get();
    if (currentIndex >= items.length) return;
    const item = items[currentIndex];
    if (item.revealed) return;
    const timeMs = Date.now() - item.startedAt;
    const grade = 0;
    const next = [...items];
    next[currentIndex] = { ...item, revealed: true, grade, isCorrect: false, fraction: 0, timeMs, skipped: true };
    set({ items: next });

    if (mode !== 'exam') {
      const progressMap = loadProgress();
      const prev = progressMap[item.question.id] ?? createInitialProgress();
      progressMap[item.question.id] = updateProgress(prev, grade, Date.now());
      saveProgress(progressMap);
    }
  },

  finish: () => {
    const { items, mode, sessionStartedAt, subjectId } = get();
    // For exam mode, progress is updated at results time (now)
    if (mode === 'exam') {
      const progressMap = loadProgress();
      for (const item of items) {
        const ctx: GradingContext = { timeMs: item.timeMs, skipped: item.skipped || !item.revealed };
        const { grade } = item.revealed && item.grade !== null ? { grade: item.grade } : gradeItem(item, ctx);
        const prev = progressMap[item.question.id] ?? createInitialProgress();
        progressMap[item.question.id] = updateProgress(prev, grade, Date.now());
      }
      saveProgress(progressMap);
      // Mark all as revealed for the results screen
      set({ items: items.map((it) => (it.revealed ? it : { ...it, revealed: true, grade: it.grade ?? 0, isCorrect: it.isCorrect ?? false })) });
    }

    const finalItems = get().items;
    const correct = finalItems.filter((it) => it.isCorrect).length;
    const summary: SessionSummary = {
      id: `${sessionStartedAt}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: sessionStartedAt,
      subjectId: subjectId ?? '',
      mode: mode ?? '',
      total: finalItems.length,
      correct,
      accuracy: finalItems.length > 0 ? correct / finalItems.length : 0,
      durationMs: Date.now() - sessionStartedAt,
    };
    appendSession(summary);
    set({ active: false });
  },

  reset: () => {
    set({
      active: false,
      mode: null,
      subjectId: null,
      items: [],
      currentIndex: 0,
      sessionStartedAt: 0,
      examDeadline: null,
      examDurationMs: 0,
      speedDeadline: null,
      streak: 0,
      emptyReason: null,
    });
  },

  retryMistakes: (subjects) => {
    const { items, subjectId } = get();
    const wrongIds = new Set(items.filter((it) => !it.isCorrect).map((it) => it.question.id));
    if (wrongIds.size === 0 || !subjectId) return;
    const filters: SessionFilters = { subjectIds: [subjectId] };
    const progressMap = loadProgress();
    const all: { question: Question; subjectId: string }[] = [];
    for (const subj of subjects) {
      if (subj.ref.id !== subjectId) continue;
      for (const q of subj.flatQuestions) {
        if (wrongIds.has(q.id)) all.push({ question: q, subjectId: subj.ref.id });
      }
    }
    if (all.length === 0) return;
    const items2 = shuffle(all).map(({ question, subjectId: sid }) => makeAnsweredQuestion(question, sid));
    const now = Date.now();
    set({
      active: true,
      mode: 'practice',
      subjectId,
      items: items2,
      currentIndex: 0,
      sessionStartedAt: now,
      examDeadline: null,
      examDurationMs: 0,
      speedDeadline: null,
      streak: 0,
      emptyReason: null,
    });
    void filters;
    void progressMap;
  },
}));

/** Trackable question ids: top-level questions only (each, including passages, has exactly one progress entry). */
export function trackableQuestionIds(subject: LoadedSubject): string[] {
  return subject.config.questions.map((q) => q.id);
}

export function aggregateSubjectMastery(subject: LoadedSubject, progressMap: Record<string, Progress>): number {
  return aggregateMastery(trackableQuestionIds(subject), progressMap);
}
