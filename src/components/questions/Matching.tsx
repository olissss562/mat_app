import { useMemo, useState } from 'react';
import type { MatchingQuestion } from '../../types/config';
import type { MatchingAnswer } from '../../lib/grading';
import { seededShuffle } from '../../lib/shuffle';
import type { QuestionComponentProps } from './types';

export default function Matching({ question, answer, onChange, revealed }: QuestionComponentProps<MatchingQuestion, MatchingAnswer>) {
  const rightOrder = useMemo(
    () => seededShuffle(question.pairs.map((_, i) => i), `${question.id}-right`),
    [question.id, question.pairs],
  );
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const current = answer ?? {};

  // Map of rightIndex -> leftIndex it's currently paired with (inverse lookup)
  const rightToLeft = useMemo(() => {
    const m = new Map<number, number>();
    Object.entries(current).forEach(([leftStr, rightIndex]) => {
      m.set(rightIndex, parseInt(leftStr, 10));
    });
    return m;
  }, [current]);

  function handleLeftClick(leftIndex: number) {
    if (revealed) return;
    setSelectedLeft((prev) => (prev === leftIndex ? null : leftIndex));
  }

  function handleRightClick(rightIndex: number) {
    if (revealed || selectedLeft === null) return;
    const next = { ...current };
    // remove any existing pairing involving this right item or the selected left item
    for (const key of Object.keys(next)) {
      const li = parseInt(key, 10);
      if (li === selectedLeft || next[li] === rightIndex) delete next[li];
    }
    next[selectedLeft] = rightIndex;
    onChange(next);
    setSelectedLeft(null);
  }

  return (
    <div>
      <p className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">{question.question}</p>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Klepněte na položku vlevo a poté na její protějšek vpravo.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {question.pairs.map((pair, leftIndex) => {
            const isPaired = current[leftIndex] !== undefined;
            const isSelected = selectedLeft === leftIndex;
            let stateClasses = 'border-gray-300 dark:border-gray-600 hover:border-violet-400';
            if (revealed) {
              const correct = current[leftIndex] === leftIndex;
              stateClasses = correct
                ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                : 'border-red-500 bg-red-50 dark:bg-red-900/30';
            } else if (isSelected) {
              stateClasses = 'border-violet-500 bg-violet-100 dark:bg-violet-900/40';
            } else if (isPaired) {
              stateClasses = 'border-violet-300 bg-violet-50 dark:bg-violet-900/20';
            }
            return (
              <button
                key={leftIndex}
                type="button"
                disabled={revealed}
                onClick={() => handleLeftClick(leftIndex)}
                className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm text-gray-900 transition-colors dark:text-gray-100 ${stateClasses}`}
              >
                {pair.left}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          {rightOrder.map((rightIndex) => {
            const pairedLeft = rightToLeft.get(rightIndex);
            const isUsed = pairedLeft !== undefined;
            let stateClasses = 'border-gray-300 dark:border-gray-600 hover:border-violet-400';
            if (revealed) {
              const correct = pairedLeft === rightIndex;
              stateClasses = isUsed
                ? correct
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/30'
                : 'border-gray-300 dark:border-gray-600';
            } else if (isUsed) {
              stateClasses = 'border-violet-300 bg-violet-50 dark:bg-violet-900/20';
            }
            return (
              <button
                key={rightIndex}
                type="button"
                disabled={revealed}
                onClick={() => handleRightClick(rightIndex)}
                className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm text-gray-900 transition-colors dark:text-gray-100 ${stateClasses}`}
              >
                {question.pairs[rightIndex].right}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
