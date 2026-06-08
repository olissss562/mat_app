import type { Question } from '../types/config';
import type { QuestionOverride } from './storage';
import { parseNumericInput } from './grading';

// Returns whether a question type can currently be edited via the in-quiz editor.
// (matching/ordering/categorize/gap/passage have richer structures that aren't worth
// the UI complexity for a "fix the marked answer" tool — they're rare to be wrong anyway.)
export function isOverridable(question: Question): boolean {
  return (
    question.type === 'single' ||
    question.type === 'multiple' ||
    question.type === 'truefalse' ||
    question.type === 'numeric'
  );
}

// Whether the "Přidat do správných odpovědí" quick-action can accept the user's own answer
// for this question type. Broader than isOverridable because for gaps we can simply append
// the typed text to the accepted list (no extra UI needed).
export function canAcceptAnswer(question: Question): boolean {
  return (
    question.type === 'single' ||
    question.type === 'multiple' ||
    question.type === 'truefalse' ||
    question.type === 'numeric' ||
    question.type === 'gap'
  );
}

// Builds the override needed so that the learner's own answer is treated as correct from now
// on. Merges onto any existing override for the question. Returns null when the answer is empty
// or the type isn't supported (caller should then no-op).
export function buildAcceptOverride(
  question: Question,
  userAnswer: unknown,
  existing: QuestionOverride | undefined,
): QuestionOverride | null {
  const base: QuestionOverride = { ...(existing ?? {}) };

  switch (question.type) {
    case 'single': {
      const idx = userAnswer as number | null;
      if (idx === null || idx === undefined) return null;
      const current = new Set<number>(
        existing?.correctOptions ??
          question.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0),
      );
      current.add(idx);
      base.correctOptions = Array.from(current).sort((a, b) => a - b);
      return base;
    }
    case 'multiple': {
      const picked = (userAnswer as number[]) ?? [];
      if (picked.length === 0) return null;
      base.correctOptions = Array.from(new Set(picked)).sort((a, b) => a - b);
      return base;
    }
    case 'truefalse': {
      const ans = userAnswer as boolean | null;
      if (ans === null || ans === undefined) return null;
      base.boolAnswer = ans;
      return base;
    }
    case 'numeric': {
      const parsed = parseNumericInput((userAnswer as string) ?? '');
      if (parsed === null) return null;
      const origAnswer = existing?.numericAnswer ?? question.answer;
      const existingTol = existing?.numericTolerance ?? question.tolerance ?? 0;
      // Widen tolerance so it covers the learner's value while still accepting the original.
      base.numericAnswer = origAnswer;
      base.numericTolerance = Math.max(existingTol, Math.abs(parsed - origAnswer));
      return base;
    }
    case 'gap': {
      const given = (userAnswer as string[]) ?? [];
      if (given.every((g) => !g || !g.trim())) return null;
      base.gapAccept = question.blanks.map((b, i) => {
        const seen = new Set<string>();
        const out: string[] = [];
        const push = (s: string | undefined) => {
          const v = (s ?? '').trim();
          if (!v) return;
          const key = v.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          out.push(v);
        };
        b.accept.forEach(push);
        (existing?.gapAccept?.[i] ?? []).forEach(push);
        push(given[i]);
        return out;
      });
      return base;
    }
    default:
      return null;
  }
}

// Applies a stored override on top of a question, returning a new question object with
// the corrected answer baked in. Used both for grading and for rendering the "correct
// answer" explanation, so the user's fix is reflected everywhere consistently.
export function applyQuestionOverride(question: Question, override: QuestionOverride | undefined): Question {
  if (!override) return question;

  if ((question.type === 'single' || question.type === 'multiple') && override.correctOptions) {
    const correctSet = new Set(override.correctOptions);
    return {
      ...question,
      options: question.options.map((opt, i) => ({ ...opt, correct: correctSet.has(i) })),
    };
  }

  if (question.type === 'truefalse' && override.boolAnswer !== undefined) {
    return { ...question, answer: override.boolAnswer };
  }

  if (question.type === 'numeric' && (override.numericAnswer !== undefined || override.numericTolerance !== undefined)) {
    return {
      ...question,
      answer: override.numericAnswer ?? question.answer,
      tolerance: override.numericTolerance ?? question.tolerance,
    };
  }

  if (question.type === 'gap' && override.gapAccept) {
    return {
      ...question,
      blanks: question.blanks.map((b, i) => ({ ...b, accept: override.gapAccept![i] ?? b.accept })),
    };
  }

  return question;
}
