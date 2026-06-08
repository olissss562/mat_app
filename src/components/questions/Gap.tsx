import type { GapQuestion } from '../../types/config';
import type { GapAnswer } from '../../lib/grading';
import type { QuestionComponentProps } from './types';

export default function Gap({ question, answer, onChange, revealed }: QuestionComponentProps<GapQuestion, GapAnswer>) {
  const values = answer ?? [];

  function setBlank(index: number, value: string) {
    const next = [...values];
    next[index] = value;
    onChange(next);
  }

  const parts = question.text.split(/(\{\{\d+\}\})/g);

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Doplňte chybějící slova do textu.</p>
      <p className="text-lg leading-relaxed text-gray-900 dark:text-gray-100">
        {parts.map((part, i) => {
          const m = part.match(/^\{\{(\d+)\}\}$/);
          if (!m) return <span key={i}>{part}</span>;
          const blankIndex = parseInt(m[1], 10);
          const blank = question.blanks[blankIndex];
          const given = (values[blankIndex] ?? '').trim().toLowerCase();
          const accepted = blank?.accept.map((a) => a.trim().toLowerCase()) ?? [];
          const isCorrect = given !== '' && accepted.includes(given);
          let inputClasses = 'border-gray-300 dark:border-gray-600 focus:border-violet-500';
          if (revealed) {
            inputClasses = isCorrect
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
              : 'border-red-500 bg-red-50 dark:bg-red-900/30';
          }
          return (
            <span key={i} className="inline-block">
              <input
                type="text"
                disabled={revealed}
                value={values[blankIndex] ?? ''}
                onChange={(e) => setBlank(blankIndex, e.target.value)}
                className={`mx-1 min-h-[40px] w-32 rounded border px-2 py-1 text-base text-gray-900 outline-none dark:bg-gray-800 dark:text-gray-100 ${inputClasses}`}
                aria-label={`Mezera ${blankIndex + 1}`}
              />
              {revealed && !isCorrect && blank && (
                <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                  ({blank.accept[0]})
                </span>
              )}
            </span>
          );
        })}
      </p>
    </div>
  );
}
