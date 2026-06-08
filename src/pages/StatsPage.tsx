import { useEffect, useRef, useState } from 'react';
import { useConfigStore } from '../store/useConfigStore';
import { aggregateMastery, isDue } from '../lib/srs';
import { exportBackup, importBackup, loadProgress, loadSessions, type BackupData } from '../lib/storage';
import MasteryBadge from '../components/MasteryBadge';
import ProgressBar from '../components/ProgressBar';

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function StatsPage() {
  const { subjects, invalid, loaded, reload, loading } = useConfigStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded && !loading) void reload();
  }, [loaded, loading, reload]);

  const progressMap = loadProgress();
  const sessions = loadSessions();

  const allQuestionIds: string[] = [];
  for (const subj of subjects) {
    for (const q of subj.config.questions) {
      allQuestionIds.push(q.id);
    }
  }
  const overallMastery = aggregateMastery(allQuestionIds, progressMap);
  const dueCount = allQuestionIds.filter((id) => isDue(progressMap[id])).length;
  const masteredCount = allQuestionIds.filter((id) => (progressMap[id]?.mastery ?? 0) >= 90).length;

  // Last 7 days activity
  const now = Date.now();
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const ts = now - i * 24 * 60 * 60 * 1000;
    const key = dayKey(ts);
    const count = sessions.filter((s) => dayKey(s.timestamp) === key).reduce((acc, s) => acc + s.total, 0);
    const d = new Date(ts);
    days.push({ label: `${d.getDate()}.${d.getMonth() + 1}.`, count });
  }
  const maxDayCount = Math.max(1, ...days.map((d) => d.count));

  function handleBackup() {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maturita-trenazer-zaloha-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRestoreClick() {
    fileInputRef.current?.click();
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      importBackup(data);
      setMessage('Pokrok byl úspěšně obnoven. Obnovte stránku, aby se projevily změny.');
    } catch {
      setMessage('Soubor se nepodařilo načíst – zkontrolujte, že jde o platnou zálohu.');
    }
    e.target.value = '';
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Statistiky</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-2xl font-semibold text-violet-600 dark:text-violet-400">{overallMastery}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Celkové zvládnutí</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{dueCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">K opakování dnes</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{masteredCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Naučeno (≥90 %)</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{allQuestionIds.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Otázek celkem</p>
        </div>
      </div>

      <h2 className="mb-2 text-lg font-medium">Mastery podle předmětů a témat</h2>
      <div className="mb-6 flex flex-col gap-4">
        {subjects.map((subj) => {
          const subjIds = subj.config.questions.map((q) => q.id);
          const subjMastery = aggregateMastery(subjIds, progressMap);
          return (
            <div key={subj.ref.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium">
                  {subj.ref.icon} {subj.config.name}
                </p>
                <MasteryBadge mastery={subjMastery} size="sm" />
              </div>
              <ProgressBar value={subjMastery} className="mb-3" />
              <div className="flex flex-col gap-2">
                {subj.config.topics.map((topic) => {
                  const topicIds = subj.config.questions.filter((q) => q.topic === topic.id).map((q) => q.id);
                  const topicMastery = aggregateMastery(topicIds, progressMap);
                  return (
                    <div key={topic.id} className="flex items-center gap-2">
                      <span className="w-32 shrink-0 truncate text-xs text-gray-500 dark:text-gray-400">{topic.name}</span>
                      <ProgressBar value={topicMastery} className="flex-1" colorClassName="bg-violet-400" />
                      <span className="w-10 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">{topicMastery}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-2 text-lg font-medium">Aktivita za posledních 7 dní</h2>
      <div className="mb-6 flex items-end gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {days.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end">
              <div
                className="w-full rounded-t bg-violet-400 dark:bg-violet-600"
                style={{ height: `${(d.count / maxDayCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
              />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{d.label}</span>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{d.count}</span>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-lg font-medium">Záloha pokroku</h2>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleBackup}
          className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
        >
          Zálohovat pokrok
        </button>
        <button
          type="button"
          onClick={handleRestoreClick}
          className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:border-violet-400 dark:border-gray-600 dark:text-gray-200"
        >
          Obnovit pokrok
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleRestoreFile} />
      </div>
      {message && <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{message}</p>}

      {invalid.length > 0 && (
        <>
          <h2 className="mb-2 text-lg font-medium">Nevalidní konfigurace</h2>
          <div className="flex flex-col gap-2">
            {invalid.map(({ ref, errors }) => (
              <div key={ref.id} className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-700 dark:bg-red-900/20">
                <p className="font-medium text-red-700 dark:text-red-300">
                  ❌ {ref.name} ({ref.file}) – nevalidní
                </p>
                <ul className="mt-1 list-inside list-disc text-red-600 dark:text-red-400">
                  {errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
