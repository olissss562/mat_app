import { useState } from 'react';
import type { Question } from '../types/config';
import { loadQuestionOverrides, setQuestionOverride, type QuestionOverride } from '../lib/storage';

interface Props {
  question: Question;
  onClose: () => void;
  onSaved: () => void;
}

// Lets the learner correct a question's marked answer locally (per account) when they
// believe it's wrong. This does NOT edit the bundled config files — it stores a small
// override that's merged onto the question whenever it's served in a session
// (see lib/questionOverrides.ts + useSessionStore.makeAnsweredQuestion).
export default function QuestionEditModal({ question, onClose, onSaved }: Props) {
  const existing = loadQuestionOverrides()[question.id];

  const [correctOptions, setCorrectOptions] = useState<Set<number>>(() => {
    if (existing?.correctOptions) return new Set(existing.correctOptions);
    if (question.type === 'single' || question.type === 'multiple') {
      return new Set(question.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0));
    }
    return new Set();
  });
  const [boolAnswer, setBoolAnswer] = useState<boolean>(
    existing?.boolAnswer ?? (question.type === 'truefalse' ? question.answer : true),
  );
  const [numericAnswer, setNumericAnswer] = useState<string>(
    String(existing?.numericAnswer ?? (question.type === 'numeric' ? question.answer : 0)),
  );
  const [numericTolerance, setNumericTolerance] = useState<string>(
    String(existing?.numericTolerance ?? (question.type === 'numeric' ? question.tolerance ?? 0 : 0)),
  );
  const [note, setNote] = useState<string>(existing?.note ?? '');

  function toggleOption(i: number) {
    setCorrectOptions((prev) => {
      const next = new Set(prev);
      if (question.type === 'single') {
        next.clear();
        next.add(i);
      } else {
        if (next.has(i)) next.delete(i);
        else next.add(i);
      }
      return next;
    });
  }

  function handleSave() {
    const override: QuestionOverride = { note: note.trim() || undefined };
    if (question.type === 'single' || question.type === 'multiple') {
      override.correctOptions = Array.from(correctOptions).sort((a, b) => a - b);
    } else if (question.type === 'truefalse') {
      override.boolAnswer = boolAnswer;
    } else if (question.type === 'numeric') {
      override.numericAnswer = Number(numericAnswer);
      override.numericTolerance = Number(numericTolerance) || 0;
    }
    setQuestionOverride(question.id, override);
    onSaved();
    onClose();
  }

  function handleReset() {
    setQuestionOverride(question.id, null);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upravit správnou odpověď</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Zavřít"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Pokud si myslíte, že je označená správná odpověď u této otázky chybná, můžete si ji zde opravit.
          Změna se uloží jen pro váš účet a projeví se při dalším zobrazení této otázky — původní soubor s
          otázkami se nemění.
        </p>

        {(question.type === 'single' || question.type === 'multiple') && (
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {question.type === 'single' ? 'Vyberte správnou možnost:' : 'Zaškrtněte správné možnosti:'}
            </p>
            {question.options.map((opt, i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                  correctOptions.has(i)
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <input
                  type={question.type === 'single' ? 'radio' : 'checkbox'}
                  name="correct-option"
                  checked={correctOptions.has(i)}
                  onChange={() => toggleOption(i)}
                  className="h-4 w-4 accent-violet-600"
                />
                <span className="text-gray-800 dark:text-gray-200">{opt.text}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'truefalse' && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Správná odpověď je:</p>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setBoolAnswer(v)}
                  className={`min-h-[44px] flex-1 rounded-lg border px-4 text-sm font-medium transition-colors ${
                    boolAnswer === v
                      ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  {v ? 'Pravda' : 'Nepravda'}
                </button>
              ))}
            </div>
          </div>
        )}

        {question.type === 'numeric' && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Správná hodnota</span>
              <input
                type="number"
                value={numericAnswer}
                onChange={(e) => setNumericAnswer(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Tolerance (±)</span>
              <input
                type="number"
                value={numericTolerance}
                onChange={(e) => setNumericTolerance(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
          </div>
        )}

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Poznámka (nepovinné)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Např. proč si myslíte, že byla odpověď chybná…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!existing}
            className="min-h-[40px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-600 transition-colors hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
          >
            Zrušit úpravu
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-600 dark:border-gray-600 dark:text-gray-300"
            >
              Zavřít
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[40px] rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700"
            >
              Uložit opravu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
