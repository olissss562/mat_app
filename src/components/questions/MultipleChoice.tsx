import { useEffect, useMemo } from 'react';
import type { MultipleQuestion } from '../../types/config';
import type { MultipleAnswer } from '../../lib/grading';
import { seededShuffle } from '../../lib/shuffle';
import type { QuestionComponentProps } from './types';

export default function MultipleChoice({ question, answer, onChange, revealed }: QuestionComponentProps<MultipleQuestion, MultipleAnswer>) {
  const order = useMemo(
    () => seededShuffle(question.options.map((_, i) => i), question.id),
    [question.id, question.options],
  );
  const selected = answer ?? [];

  function toggle(optIndex: number) {
    if (revealed) return;
    if (selected.includes(optIndex)) {
      onChange(selected.filter((i) => i !== optIndex));
    } else {
      onChange([...selected, optIndex]);
    }
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (revealed) return;
      const num = parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= order.length) {
        toggle(order[num - 1]);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <div>
      <p className="mb-1 text-lg font-medium text-gray-900 dark:text-gray-100">{question.question}</p>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Vyberte všechny správné možnosti.</p>
      <div className="flex flex-col gap-2">
        {order.map((optIndex, displayIndex) => {
          const opt = question.options[optIndex];
          const isSelected = selected.includes(optIndex);
          let stateClasses = 'border-gray-300 dark:border-gray-600 hover:border-violet-400';
          if (revealed) {
            if (opt.correct) {
              stateClasses = 'border-green-500 bg-green-50 dark:bg-green-900/30';
            } else if (isSelected) {
              stateClasses = 'border-red-500 bg-red-50 dark:bg-red-900/30';
            }
          } else if (isSelected) {
            stateClasses = 'border-violet-500 bg-violet-50 dark:bg-violet-900/30';
          }
          return (
            <button
              key={optIndex}
              type="button"
              aria-pressed={isSelected}
              disabled={revealed}
              onClick={() => toggle(optIndex)}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${stateClasses}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs ${
                  isSelected
                    ? 'border-violet-500 bg-violet-500 text-white'
                    : 'border-gray-400 text-gray-500 dark:border-gray-500 dark:text-gray-400'
                }`}
              >
                {displayIndex + 1}
              </span>
              <span className="text-gray-900 dark:text-gray-100">{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
