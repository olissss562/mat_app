import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfigStore } from '../store/useConfigStore';
import { useSessionStore, type SessionMode } from '../store/useSessionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { QuestionType } from '../types/config';

const MODES: { id: SessionMode; label: string; description: string }[] = [
  { id: 'practice', label: 'Cvičný', description: 'Okamžitá zpětná vazba a vysvětlení po každé otázce.' },
  { id: 'exam', label: 'Zkouškový', description: 'Časový limit, výsledky až na konci.' },
  { id: 'mistakes', label: 'Opakování chyb', description: 'Otázky, které vám naposledy nešly.' },
  { id: 'srs', label: 'Rozložené opakování', description: 'Otázky, které jsou právě na řadě (SRS).' },
  { id: 'mix', label: 'Mix', description: 'Všechny otázky předmětu v náhodném pořadí.' },
  { id: 'topic', label: 'Podle tématu', description: 'Jen vybraná témata.' },
  { id: 'speed', label: 'Rychlovka', description: 'Časový limit na otázku, série správných odpovědí.' },
];

const TYPE_LABELS: Record<QuestionType, string> = {
  single: 'Výběr jedné odpovědi',
  multiple: 'Výběr více odpovědí',
  truefalse: 'Pravda/Nepravda',
  matching: 'Přiřazování',
  ordering: 'Řazení',
  numeric: 'Číselná odpověď',
  categorize: 'Kategorizace',
  gap: 'Doplňování',
  passage: 'Úryvek s podotázkami',
};

const EXAM_LENGTHS: (number | 'all')[] = [10, 20, 30, 'all'];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[40px] rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-violet-500 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
          : 'border-gray-300 text-gray-600 hover:border-violet-400 dark:border-gray-600 dark:text-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

export default function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subjects, loaded, reload, loading } = useConfigStore();
  const setLastSubject = useSettingsStore((s) => s.setLastSubject);
  const startSession = useSessionStore((s) => s.startSession);
  const emptyReason = useSessionStore((s) => s.emptyReason);

  useEffect(() => {
    if (!loaded && !loading) void reload();
  }, [loaded, loading, reload]);

  const subject = subjects.find((s) => s.ref.id === id);

  const [mode, setMode] = useState<SessionMode>('practice');
  const [topics, setTopics] = useState<string[]>([]);
  const [types, setTypes] = useState<QuestionType[]>([]);
  const [difficulties, setDifficulties] = useState<number[]>([]);
  const [examLength, setExamLength] = useState<number | 'all'>(10);

  useEffect(() => {
    if (id) setLastSubject(id);
  }, [id, setLastSubject]);

  const availableTypes = useMemo(() => {
    if (!subject) return [];
    const set = new Set<QuestionType>();
    subject.config.questions.forEach((q) => set.add(q.type));
    return Array.from(set);
  }, [subject]);

  const filteredCount = useMemo(() => {
    if (!subject) return 0;
    return subject.config.questions.filter((q) => {
      if (topics.length > 0 && !topics.includes(q.topic)) return false;
      if (types.length > 0 && !types.includes(q.type)) return false;
      if (difficulties.length > 0 && !difficulties.includes(q.difficulty ?? 1)) return false;
      return true;
    }).length;
  }, [subject, topics, types, difficulties]);

  function toggle<T>(value: T, list: T[], setList: (v: T[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function handleStart() {
    if (!subject) return;
    startSession(subjects, mode, {
      subjectIds: [subject.ref.id],
      topics: topics.length > 0 ? topics : undefined,
      types: types.length > 0 ? types : undefined,
      difficulties: difficulties.length > 0 ? difficulties : undefined,
      examLength: mode === 'exam' ? examLength : undefined,
    });
    navigate('/quiz');
  }

  if (!loaded && loading) {
    return <p className="text-gray-500 dark:text-gray-400">Načítám…</p>;
  }
  if (!subject) {
    return (
      <div>
        <p className="text-gray-500 dark:text-gray-400">Předmět nenalezen.</p>
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
        {subject.ref.icon} {subject.config.name}
      </h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">Nastavte si trénink podle svých potřeb.</p>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Režim</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`min-h-[44px] rounded-lg border p-3 text-left transition-colors ${
                mode === m.id
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                  : 'border-gray-300 hover:border-violet-400 dark:border-gray-600'
              }`}
            >
              <p className="font-medium text-gray-900 dark:text-gray-100">{m.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{m.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Témata</h2>
        <div className="flex flex-wrap gap-2">
          {subject.config.topics.map((t) => (
            <Chip key={t.id} active={topics.includes(t.id)} onClick={() => toggle(t.id, topics, setTopics)}>
              {t.name}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Typy otázek</h2>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((t) => (
            <Chip key={t} active={types.includes(t)} onClick={() => toggle(t, types, setTypes)}>
              {TYPE_LABELS[t]}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Obtížnost</h2>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((d) => (
            <Chip key={d} active={difficulties.includes(d)} onClick={() => toggle(d, difficulties, setDifficulties)}>
              {'★'.repeat(d)}
            </Chip>
          ))}
        </div>
      </section>

      {mode === 'exam' && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Počet otázek</h2>
          <div className="flex flex-wrap gap-2">
            {EXAM_LENGTHS.map((len) => (
              <Chip key={String(len)} active={examLength === len} onClick={() => setExamLength(len)}>
                {len === 'all' ? 'Vše' : len}
              </Chip>
            ))}
          </div>
        </section>
      )}

      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        {mode === 'exam' && examLength !== 'all'
          ? `Vybráno ${Math.min(examLength, filteredCount)} otázek`
          : `Vybráno ${filteredCount} otázek`}
      </p>

      {emptyReason && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {emptyReason}
        </div>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={filteredCount === 0}
        className="min-h-[44px] w-full rounded-lg bg-violet-600 px-6 py-3 text-lg font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-40 sm:w-auto"
      >
        Spustit
      </button>
    </div>
  );
}
