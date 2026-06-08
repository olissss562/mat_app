import { useState } from 'react';
import type { PassageQuestion, Question, SubQuestion } from '../../types/config';
import type { QuestionComponentProps } from './types';
import QuestionRenderer from './QuestionRenderer';
import Feedback from '../Feedback';
import { gradeQuestion } from '../../lib/grading';
import { correctAnswerText } from './correctAnswerText';

export type PassageAnswer = unknown[];

function toFullQuestion(sub: SubQuestion, parent: PassageQuestion, index: number): Question {
  return { ...sub, id: `${parent.id}-sub-${index}`, topic: parent.topic } as Question;
}

export default function Passage({ question, answer, onChange, revealed }: QuestionComponentProps<PassageQuestion, PassageAnswer>) {
  const [collapsed, setCollapsed] = useState(false);
  const answers = answer ?? [];

  function setSubAnswer(index: number, value: unknown) {
    const next = [...answers];
    next[index] = value;
    onChange(next);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-4 lg:self-start">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mb-2 text-sm font-medium text-violet-600 dark:text-violet-400 lg:hidden"
        >
          {collapsed ? 'Zobrazit úryvek ▾' : 'Skrýt úryvek ▴'}
        </button>
        {!collapsed && (
          <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {question.passage}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-6">
        {question.questions.map((sub, i) => {
          const fullQ = toFullQuestion(sub, question, i);
          const subAnswer = answers[i];
          let outcome: { isCorrect: boolean } | null = null;
          if (revealed && fullQ.type !== 'passage') {
            outcome = gradeQuestion(fullQ, subAnswer, { timeMs: 0 });
          }
          return (
            <div key={i} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0 dark:border-gray-700">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Otázka {i + 1}</p>
              <QuestionRenderer
                question={fullQ}
                answer={subAnswer}
                onChange={(val) => setSubAnswer(i, val)}
                revealed={revealed}
              />
              {revealed && outcome && (
                <Feedback
                  isCorrect={outcome.isCorrect}
                  explanation={fullQ.explanation}
                  source={fullQ.source}
                  correctAnswerText={correctAnswerText(fullQ)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
