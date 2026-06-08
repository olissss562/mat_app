import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';
import { useConfigStore } from '../store/useConfigStore';
import { correctAnswerText } from '../components/questions/correctAnswerText';
import QuestionRenderer from '../components/questions/QuestionRenderer';

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m} min ${s} s`;
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const { subjects } = useConfigStore();
  const { items, mode, subjectId, sessionStartedAt, retryMistakes, reset } = useSessionStore();

  useEffect(() => {
    if (items.length === 0) navigate('/');
  }, [items.length, navigate]);

  if (items.length === 0) return null;

  const correct = items.filter((it) => it.isCorrect).length;
  const accuracy = Math.round((correct / items.length) * 100);
  const durationMs = Date.now() - sessionStartedAt;
  const hasMistakes = items.some((it) => !it.isCorrect);

  function handleRetryMistakes() {
    retryMistakes(subjects);
    navigate('/quiz');
  }

  function handleAgain() {
    if (!subjectId) return;
    reset();
    navigate(`/subject/${subjectId}`);
  }

  function handleHome() {
    reset();
    navigate('/');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Výsledky</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">Souhrn vaší {mode === 'exam' ? 'zkoušky' : 'session'}.</p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-2xl font-semibold text-violet-600 dark:text-violet-400">{accuracy}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Úspěšnost</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {correct}/{items.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Správně</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(durationMs)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Čas</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {hasMistakes && (
          <button
            type="button"
            onClick={handleRetryMistakes}
            className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
          >
            Opakovat chyby
          </button>
        )}
        <button
          type="button"
          onClick={handleAgain}
          className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:border-violet-400 dark:border-gray-600 dark:text-gray-200"
        >
          Znovu
        </button>
        <button
          type="button"
          onClick={handleHome}
          className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:border-violet-400 dark:border-gray-600 dark:text-gray-200"
        >
          Domů
        </button>
      </div>

      <h2 className="mb-3 text-lg font-medium">Přehled otázek</h2>
      <div className="flex flex-col gap-4">
        {items.map((it, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 ${
              it.isCorrect
                ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Otázka {i + 1}
              </span>
              <span className={`text-sm font-semibold ${it.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {it.skipped ? 'Přeskočeno' : it.isCorrect ? 'Správně' : 'Špatně'}
              </span>
            </div>
            <div className="pointer-events-none opacity-90">
              <QuestionRenderer question={it.question} answer={it.answer} onChange={() => {}} revealed />
            </div>
            {it.question.type !== 'passage' && (
              <>
                {!it.isCorrect && (
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Správná odpověď: </span>
                    {correctAnswerText(it.question)}
                  </p>
                )}
                {it.question.explanation && (
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Vysvětlení: </span>
                    {it.question.explanation}
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
