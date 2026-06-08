import { useEffect, useMemo, useState } from 'react';
import type { OrderingQuestion } from '../../types/config';
import type { OrderingAnswer } from '../../lib/grading';
import { seededShuffle } from '../../lib/shuffle';
import type { QuestionComponentProps } from './types';

export default function Ordering({ question, answer, onChange, revealed }: QuestionComponentProps<OrderingQuestion, OrderingAnswer>) {
  const initialOrder = useMemo(() => {
    let shuffled = seededShuffle(question.items.map((_, i) => i), question.id);
    // never present already-correct order
    if (shuffled.every((v, i) => v === i)) {
      shuffled = [...shuffled.slice(1), shuffled[0]];
    }
    return shuffled;
  }, [question.id, question.items]);

  const order = answer && answer.length === question.items.length ? answer : initialOrder;

  useEffect(() => {
    if (!answer || answer.length !== question.items.length) {
      onChange(initialOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (revealed || from === to || from < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function moveUp(i: number) {
    move(i, i - 1);
  }
  function moveDown(i: number) {
    move(i, i + 1);
  }

  return (
    <div>
      <p className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">{question.question}</p>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Přetáhněte položky do správného pořadí (nebo použijte šipky).
      </p>
      <ul className="flex flex-col gap-2">
        {order.map((origIndex, position) => {
          const isCorrectPosition = revealed && origIndex === position;
          const isWrongPosition = revealed && origIndex !== position;
          let stateClasses = 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800';
          if (isCorrectPosition) stateClasses = 'border-green-500 bg-green-50 dark:bg-green-900/30';
          else if (isWrongPosition) stateClasses = 'border-red-500 bg-red-50 dark:bg-red-900/30';

          return (
            <li
              key={origIndex}
              draggable={!revealed}
              onDragStart={() => setDragIndex(position)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, position);
                setDragIndex(null);
              }}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2 text-sm text-gray-900 transition-colors dark:text-gray-100 ${stateClasses} ${
                !revealed ? 'cursor-move' : ''
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-400 text-xs text-gray-500 dark:border-gray-500 dark:text-gray-400">
                {position + 1}
              </span>
              <span className="flex-1">{question.items[origIndex]}</span>
              {!revealed && (
                <span className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Posunout nahoru"
                    onClick={() => moveUp(position)}
                    disabled={position === 0}
                    className="px-2 text-gray-500 hover:text-violet-500 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Posunout dolů"
                    onClick={() => moveDown(position)}
                    disabled={position === order.length - 1}
                    className="px-2 text-gray-500 hover:text-violet-500 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
