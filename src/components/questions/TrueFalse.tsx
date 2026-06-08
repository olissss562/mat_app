import { useEffect } from 'react';
import type { TrueFalseQuestion } from '../../types/config';
import type { TrueFalseAnswer } from '../../lib/grading';
import type { QuestionComponentProps } from './types';

export default function TrueFalse({ question, answer, onChange, revealed }: QuestionComponentProps<TrueFalseQuestion, TrueFalseAnswer>) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (revealed) return;
      const key = e.key.toLowerCase();
      if (key === '1' || key === 'p') onChange(true);
      else if (key === '2' || key === 'n') onChange(false);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onChange, revealed]);

  function btnClasses(value: boolean) {
    const isSelected = answer === value;
    if (revealed) {
      if (question.answer === value) return 'border-green-500 bg-green-50 dark:bg-green-900/30';
      if (isSelected) return 'border-red-500 bg-red-50 dark:bg-red-900/30';
      return 'border-gray-300 dark:border-gray-600';
    }
    return isSelected
      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
      : 'border-gray-300 dark:border-gray-600 hover:border-violet-400';
  }

  return (
    <div>
      <p className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">{question.statement}</p>
      <div className="flex gap-3">
        <button
          type="button"
          aria-pressed={answer === true}
          disabled={revealed}
          onClick={() => onChange(true)}
          className={`min-h-[44px] flex-1 rounded-lg border px-4 py-4 text-lg font-medium text-gray-900 transition-colors dark:text-gray-100 ${btnClasses(true)}`}
        >
          Pravda
        </button>
        <button
          type="button"
          aria-pressed={answer === false}
          disabled={revealed}
          onClick={() => onChange(false)}
          className={`min-h-[44px] flex-1 rounded-lg border px-4 py-4 text-lg font-medium text-gray-900 transition-colors dark:text-gray-100 ${btnClasses(false)}`}
        >
          Nepravda
        </button>
      </div>
    </div>
  );
}
