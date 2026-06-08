import type { Question } from '../types/config';
import type { QuestionOverride } from './storage';

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

  return question;
}
