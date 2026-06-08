import type {
  CategorizeQuestion,
  GapQuestion,
  MatchingQuestion,
  MultipleQuestion,
  NumericQuestion,
  OrderingQuestion,
  Question,
  SingleQuestion,
  TrueFalseQuestion,
} from '../types/config';

export const FAST_THRESHOLD_MS = 8000;
export const VERY_SLOW_THRESHOLD_MS = 24000;

export interface GradingContext {
  timeMs: number;
  usedHint?: boolean;
  skipped?: boolean;
}

export interface GradeOutcome {
  fraction: number; // 0..1, how much of the answer was correct
  isCorrect: boolean; // fraction === 1
  grade: number; // 0..5, fed into SM-2
}

/** Maps a correctness fraction + timing/hint context to a 0..5 SM-2 grade. */
export function fractionToGrade(fraction: number, ctx: GradingContext): number {
  if (ctx.skipped) return 0;

  if (fraction >= 1) {
    if (ctx.usedHint || ctx.timeMs > VERY_SLOW_THRESHOLD_MS) return 3;
    if (ctx.timeMs <= FAST_THRESHOLD_MS) return 5;
    return 4;
  }
  if (fraction >= 0.5) return 2;
  return 1;
}

function finish(fraction: number, ctx: GradingContext): GradeOutcome {
  const clamped = Math.max(0, Math.min(1, fraction));
  return {
    fraction: clamped,
    isCorrect: clamped === 1,
    grade: fractionToGrade(clamped, ctx),
  };
}

// ---------- Per-type answer shapes ----------
export type SingleAnswer = number | null; // selected option index
export type MultipleAnswer = number[]; // selected option indices
export type TrueFalseAnswer = boolean | null;
export type MatchingAnswer = Record<number, number>; // leftIndex -> rightIndex
export type OrderingAnswer = number[]; // current order, as indices into the original `items` array
export type NumericAnswer = string; // raw text input
export type CategorizeAnswer = Record<number, string>; // itemIndex -> category
export type GapAnswer = string[]; // per-blank raw text

export function gradeSingle(q: SingleQuestion, answer: SingleAnswer, ctx: GradingContext): GradeOutcome {
  if (answer === null || answer === undefined) return finish(0, { ...ctx, skipped: ctx.skipped ?? true });
  const correct = q.options[answer]?.correct === true;
  return finish(correct ? 1 : 0, ctx);
}

export function gradeMultiple(q: MultipleQuestion, answer: MultipleAnswer, ctx: GradingContext): GradeOutcome {
  if (!answer || answer.length === 0) return finish(0, { ...ctx, skipped: ctx.skipped ?? true });
  const picked = new Set(answer);
  let correctCount = 0;
  q.options.forEach((opt, i) => {
    const shouldPick = opt.correct;
    const wasPicked = picked.has(i);
    if (shouldPick === wasPicked) correctCount += 1;
  });
  const fraction = correctCount / q.options.length;
  return finish(fraction, ctx);
}

export function gradeTrueFalse(q: TrueFalseQuestion, answer: TrueFalseAnswer, ctx: GradingContext): GradeOutcome {
  if (answer === null || answer === undefined) return finish(0, { ...ctx, skipped: ctx.skipped ?? true });
  return finish(answer === q.answer ? 1 : 0, ctx);
}

export function gradeMatching(q: MatchingQuestion, answer: MatchingAnswer, ctx: GradingContext): GradeOutcome {
  if (!answer || Object.keys(answer).length === 0) return finish(0, { ...ctx, skipped: ctx.skipped ?? true });
  let correctCount = 0;
  q.pairs.forEach((_, leftIndex) => {
    if (answer[leftIndex] === leftIndex) correctCount += 1;
  });
  return finish(correctCount / q.pairs.length, ctx);
}

export function gradeOrdering(q: OrderingQuestion, answer: OrderingAnswer, ctx: GradingContext): GradeOutcome {
  if (!answer || answer.length === 0) return finish(0, { ...ctx, skipped: ctx.skipped ?? true });
  let correctCount = 0;
  answer.forEach((originalIndex, position) => {
    if (originalIndex === position) correctCount += 1;
  });
  return finish(correctCount / q.items.length, ctx);
}

export function parseNumericInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return null;
  const n = Number(normalized);
  return Number.isNaN(n) ? null : n;
}

export function gradeNumeric(q: NumericQuestion, answer: NumericAnswer, ctx: GradingContext): GradeOutcome {
  const parsed = parseNumericInput(answer ?? '');
  if (parsed === null) return finish(0, { ...ctx, skipped: ctx.skipped ?? true });
  const tolerance = q.tolerance ?? 0;
  const correct = Math.abs(parsed - q.answer) <= tolerance;
  return finish(correct ? 1 : 0, ctx);
}

export function gradeCategorize(q: CategorizeQuestion, answer: CategorizeAnswer, ctx: GradingContext): GradeOutcome {
  if (!answer || Object.keys(answer).length === 0) return finish(0, { ...ctx, skipped: ctx.skipped ?? true });
  let correctCount = 0;
  q.items.forEach((item, i) => {
    if (answer[i] === item.category) correctCount += 1;
  });
  return finish(correctCount / q.items.length, ctx);
}

export function gradeGap(q: GapQuestion, answer: GapAnswer, ctx: GradingContext): GradeOutcome {
  if (!answer || answer.every((a) => !a || a.trim() === '')) {
    return finish(0, { ...ctx, skipped: ctx.skipped ?? true });
  }
  let correctCount = 0;
  q.blanks.forEach((blank, i) => {
    const given = (answer[i] ?? '').trim().toLowerCase();
    const accepted = blank.accept.map((a) => a.trim().toLowerCase());
    if (given !== '' && accepted.includes(given)) correctCount += 1;
  });
  return finish(correctCount / q.blanks.length, ctx);
}

/** Generic entry point - dispatches on question.type. `answer` must match the corresponding *Answer type. */
export function gradeQuestion(q: Question, answer: unknown, ctx: GradingContext): GradeOutcome {
  switch (q.type) {
    case 'single':
      return gradeSingle(q, answer as SingleAnswer, ctx);
    case 'multiple':
      return gradeMultiple(q, answer as MultipleAnswer, ctx);
    case 'truefalse':
      return gradeTrueFalse(q, answer as TrueFalseAnswer, ctx);
    case 'matching':
      return gradeMatching(q, answer as MatchingAnswer, ctx);
    case 'ordering':
      return gradeOrdering(q, answer as OrderingAnswer, ctx);
    case 'numeric':
      return gradeNumeric(q, answer as NumericAnswer, ctx);
    case 'categorize':
      return gradeCategorize(q, answer as CategorizeAnswer, ctx);
    case 'gap':
      return gradeGap(q, answer as GapAnswer, ctx);
    case 'passage':
      throw new Error('Passage questions are graded by averaging sub-question grades');
  }
}
