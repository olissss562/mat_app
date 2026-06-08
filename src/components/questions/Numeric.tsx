import type { NumericQuestion } from '../../types/config';
import type { NumericAnswer } from '../../lib/grading';
import { parseNumericInput } from '../../lib/grading';
import type { QuestionComponentProps } from './types';

export default function Numeric({ question, answer, onChange, revealed }: QuestionComponentProps<NumericQuestion, NumericAnswer>) {
  const value = answer ?? '';
  const parsed = parseNumericInput(value);
  const tolerance = question.tolerance ?? 0;
  const isCorrect = parsed !== null && Math.abs(parsed - question.answer) <= tolerance;

  let inputClasses = 'border-gray-300 dark:border-gray-600 focus:border-violet-500';
  if (revealed) {
    inputClasses = isCorrect
      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
      : 'border-red-500 bg-red-50 dark:bg-red-900/30';
  }

  return (
    <div>
      <p className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">{question.question}</p>
      <label className="block">
        <span className="sr-only">Číselná odpověď</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            disabled={revealed}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`min-h-[44px] w-40 rounded-lg border px-3 py-2 text-lg text-gray-900 outline-none transition-colors dark:bg-gray-800 dark:text-gray-100 ${inputClasses}`}
            placeholder="Vaše odpověď"
          />
          {question.unit && <span className="text-gray-500 dark:text-gray-400">{question.unit}</span>}
        </div>
      </label>
      {revealed && !isCorrect && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Správná odpověď: <span className="font-medium">{question.answer}{question.unit ? ` ${question.unit}` : ''}</span>
        </p>
      )}
    </div>
  );
}
