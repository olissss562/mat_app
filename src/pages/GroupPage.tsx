import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConfigStore } from '../store/useConfigStore';
import { aggregateSubjectMastery } from '../store/useSessionStore';
import { loadProgress } from '../lib/storage';
import MasteryBadge from '../components/MasteryBadge';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subjects, loaded, loading, reload } = useConfigStore();

  useEffect(() => {
    if (!loaded && !loading) void reload();
  }, [loaded, loading, reload]);

  const groupSubjects = subjects.filter((s) => s.group.id === id);
  const group = groupSubjects[0]?.group;
  const progressMap = loadProgress();

  if (!loaded && loading) {
    return <p className="text-gray-500 dark:text-gray-400">Načítám…</p>;
  }
  if (!group) {
    return (
      <div>
        <p className="text-gray-500 dark:text-gray-400">Složka nenalezena.</p>
        <button onClick={() => navigate('/')} className="mt-2 text-violet-600 underline dark:text-violet-400">
          Zpět na domů
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/')} className="mb-2 text-sm text-violet-600 hover:underline dark:text-violet-400">
        ← Zpět
      </button>
      <h1 className="mb-1 text-2xl font-semibold">
        {group.icon ?? '📁'} {group.name}
      </h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">Vyberte si téma a začněte trénovat.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {groupSubjects.map((subj) => {
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
    </div>
  );
}
