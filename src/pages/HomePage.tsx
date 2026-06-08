import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConfigStore } from '../store/useConfigStore';
import { aggregateSubjectMastery } from '../store/useSessionStore';
import { loadProgress } from '../lib/storage';
import MasteryBadge from '../components/MasteryBadge';

export default function HomePage() {
  const { subjects, invalid, loading, loaded, reload } = useConfigStore();

  useEffect(() => {
    if (!loaded && !loading) void reload();
  }, [loaded, loading, reload]);

  const progressMap = loadProgress();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Maturita Trenažér</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">Vyberte si předmět a začněte trénovat.</p>

      {loading && <p className="text-gray-500 dark:text-gray-400">Načítám obsah…</p>}

      {invalid.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          ⚠️ {invalid.length} {invalid.length === 1 ? 'konfigurace je nevalidní' : 'konfigurací je nevalidních'} a nebyla
          načtena. Podrobnosti najdete na stránce Statistiky.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {subjects.map((subj) => {
          const mastery = aggregateSubjectMastery(subj, progressMap);
          const questionCount = subj.config.questions.length;
          return (
            <Link
              key={subj.ref.id}
              to={`/subject/${subj.ref.id}`}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <span className="text-3xl">{subj.ref.icon ?? '📚'}</span>
              <div className="flex-1">
                <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">{subj.config.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{questionCount} otázek</p>
              </div>
              <MasteryBadge mastery={mastery} />
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          to="/stats"
          className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 p-4 text-gray-700 hover:border-violet-400 dark:border-gray-600 dark:text-gray-200"
        >
          <span className="text-2xl">📊</span>
          <span className="font-medium">Statistiky</span>
        </Link>
        <Link
          to="/import"
          className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 p-4 text-gray-700 hover:border-violet-400 dark:border-gray-600 dark:text-gray-200"
        >
          <span className="text-2xl">📥</span>
          <span className="font-medium">Import obsahu</span>
        </Link>
      </div>
    </div>
  );
}
