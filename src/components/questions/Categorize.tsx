import { useState } from 'react';
import type { CategorizeQuestion } from '../../types/config';
import type { CategorizeAnswer } from '../../lib/grading';
import type { QuestionComponentProps } from './types';

export default function Categorize({ question, answer, onChange, revealed }: QuestionComponentProps<CategorizeQuestion, CategorizeAnswer>) {
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const current = answer ?? {};

  function assign(itemIndex: number, category: string) {
    if (revealed) return;
    onChange({ ...current, [itemIndex]: category });
    setSelectedItem(null);
  }

  function handleChipClick(itemIndex: number) {
    if (revealed) return;
    setSelectedItem((prev) => (prev === itemIndex ? null : itemIndex));
  }

  return (
    <div>
      <p className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">{question.question}</p>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Vyberte položku a poté klepněte na kategorii, do které patří.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {question.items.map((item, itemIndex) => {
          const assigned = current[itemIndex];
          const isSelected = selectedItem === itemIndex;
          let stateClasses = 'border-gray-300 dark:border-gray-600 hover:border-violet-400';
          if (revealed) {
            const correct = assigned === item.category;
            stateClasses = correct
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
              : 'border-red-500 bg-red-50 dark:bg-red-900/30';
          } else if (isSelected) {
            stateClasses = 'border-violet-500 bg-violet-100 dark:bg-violet-900/40';
          } else if (assigned) {
            stateClasses = 'border-violet-300 bg-violet-50 dark:bg-violet-900/20';
          }
          return (
            <button
              key={itemIndex}
              type="button"
              disabled={revealed}
              onClick={() => handleChipClick(itemIndex)}
              className={`min-h-[44px] rounded-full border px-4 py-2 text-sm text-gray-900 transition-colors dark:text-gray-100 ${stateClasses}`}
            >
              {item.text}
              {assigned && !revealed && <span className="ml-2 text-xs text-violet-500">→ {assigned}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.categories.map((category) => (
          <button
            key={category}
            type="button"
            disabled={revealed}
            onClick={() => selectedItem !== null && assign(selectedItem, category)}
            className="min-h-[44px] rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-left font-medium text-gray-700 transition-colors hover:border-violet-400 dark:border-gray-600 dark:text-gray-200"
          >
            {category}
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {question.items.map((item, i) =>
                current[i] === category ? (
                  <li key={i} className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                    {item.text}
                  </li>
                ) : null,
              )}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}
