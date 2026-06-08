import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import {
  serverListCommunity,
  serverLoadMyConfigs,
  serverSaveMyConfigs,
  serverShareSubject,
  serverWithdrawSubject,
} from '../lib/serverApi';
import { useConfigStore } from '../store/useConfigStore';
import {
  loadCommunitySubjects,
  loadMyConfigs,
  saveMyConfigs,
  shareSubjectToCommunity,
  unshareSubjectFromCommunity,
  type CommunitySubject,
} from '../lib/storage';
import type { Question, QuestionType, SubjectConfig } from '../types/config';

const DEFAULT_TOPIC = 'obecne';

const TYPE_LABELS: Record<'single' | 'multiple' | 'truefalse' | 'numeric', string> = {
  single: 'Jedna správná odpověď',
  multiple: 'Více správných odpovědí',
  truefalse: 'Pravda / Nepravda',
  numeric: 'Číselná odpověď',
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `predmet-${Date.now().toString(36)}`
  );
}

function emptyQuestionDraft(type: QuestionType) {
  return {
    type,
    text: '',
    explanation: '',
    options: ['', '', '', ''],
    correctOptions: new Set<number>([0]),
    boolAnswer: true,
    numericAnswer: '',
    numericTolerance: '0',
  };
}

type QuestionDraft = ReturnType<typeof emptyQuestionDraft>;

function buildQuestion(subjectId: string, index: number, draft: QuestionDraft): Question | null {
  const id = `${subjectId}-${(index + 1).toString().padStart(3, '0')}`;
  const base = {
    id,
    topic: DEFAULT_TOPIC,
    explanation: draft.explanation.trim() || undefined,
  };
  if (draft.type === 'single' || draft.type === 'multiple') {
    const options = draft.options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (options.length < 2) return null;
    if (draft.correctOptions.size === 0) return null;
    return {
      ...base,
      type: draft.type,
      question: draft.text.trim(),
      options: options.map((text, i) => ({ text, correct: draft.correctOptions.has(i) })),
    } as Question;
  }
  if (draft.type === 'truefalse') {
    return { ...base, type: 'truefalse', statement: draft.text.trim(), answer: draft.boolAnswer } as Question;
  }
  if (draft.type === 'numeric') {
    const answer = Number(draft.numericAnswer);
    if (Number.isNaN(answer)) return null;
    return {
      ...base,
      type: 'numeric',
      question: draft.text.trim(),
      answer,
      tolerance: Number(draft.numericTolerance) || 0,
    } as Question;
  }
  return null;
}

function QuestionForm({
  draft,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: QuestionDraft;
  onChange: (d: QuestionDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  function setOption(i: number, value: string) {
    const options = [...draft.options];
    options[i] = value;
    onChange({ ...draft, options });
  }
  function toggleCorrect(i: number) {
    const correctOptions = new Set(draft.correctOptions);
    if (draft.type === 'single') {
      correctOptions.clear();
      correctOptions.add(i);
    } else {
      if (correctOptions.has(i)) correctOptions.delete(i);
      else correctOptions.add(i);
    }
    onChange({ ...draft, correctOptions });
  }

  const isChoice = draft.type === 'single' || draft.type === 'multiple';

  return (
    <div className="rounded-xl border border-violet-300 bg-violet-50/40 p-4 dark:border-violet-700 dark:bg-violet-900/10">
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(emptyQuestionDraft(t))}
            className={`min-h-[36px] rounded-lg border px-3 text-sm font-medium transition-colors ${
              draft.type === t
                ? 'border-violet-500 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <label className="mb-3 block text-sm">
        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
          {draft.type === 'truefalse' ? 'Tvrzení' : 'Znění otázky'}
        </span>
        <textarea
          value={draft.text}
          onChange={(e) => onChange({ ...draft, text: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </label>

      {isChoice && (
        <div className="mb-3 space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Možnosti (zaškrtněte správné{draft.type === 'single' ? ', jen jedna' : ', jedna nebo více'}):
          </p>
          {draft.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type={draft.type === 'single' ? 'radio' : 'checkbox'}
                name="my-correct-option"
                checked={draft.correctOptions.has(i)}
                onChange={() => toggleCorrect(i)}
                className="h-4 w-4 accent-violet-600"
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Možnost ${i + 1}`}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          ))}
        </div>
      )}

      {draft.type === 'truefalse' && (
        <div className="mb-3 flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange({ ...draft, boolAnswer: v })}
              className={`min-h-[40px] flex-1 rounded-lg border px-4 text-sm font-medium transition-colors ${
                draft.boolAnswer === v
                  ? 'border-violet-500 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                  : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              {v ? 'Pravda' : 'Nepravda'}
            </button>
          ))}
        </div>
      )}

      {draft.type === 'numeric' && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Správná hodnota</span>
            <input
              type="number"
              value={draft.numericAnswer}
              onChange={(e) => onChange({ ...draft, numericAnswer: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Tolerance (±)</span>
            <input
              type="number"
              value={draft.numericTolerance}
              onChange={(e) => onChange({ ...draft, numericTolerance: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
        </div>
      )}

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Vysvětlení (nepovinné)</span>
        <textarea
          value={draft.explanation}
          onChange={(e) => onChange({ ...draft, explanation: e.target.value })}
          rows={2}
          placeholder="Zobrazí se po zodpovězení otázky."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[40px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-600 dark:border-gray-600 dark:text-gray-300"
        >
          Zrušit
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="min-h-[40px] rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700"
        >
          Přidat otázku
        </button>
      </div>
    </div>
  );
}

export default function MyQuestionsPage() {
  const { username, token } = useAuthStore();
  const reload = useConfigStore((s) => s.reload);

  const [configs, setConfigs] = useState<SubjectConfig[]>(() => loadMyConfigs());
  const [community, setCommunity] = useState<CommunitySubject[]>(() => loadCommunitySubjects());

  // When signed in with a server session, pull the latest from the server (so subjects
  // created on another device show up here too) and refresh the community list from there.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const result = await serverLoadMyConfigs(token);
      if (!cancelled && result.ok && result.data.configs.length > 0) {
        setConfigs((prev) => {
          const merged = [...prev];
          for (const c of result.data.configs) {
            if (!merged.some((m) => m.subject === c.subject)) merged.push(c);
          }
          saveMyConfigs(merged);
          return merged;
        });
      }
      const list = await serverListCommunity(token);
      if (!cancelled && list.ok) setCommunity(list.data.items);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Mirrors the personal subject list to the server (best-effort) so it's available on
  // other devices and visible to the admin.
  function syncToServer(next: SubjectConfig[]) {
    if (token) void serverSaveMyConfigs(token, next);
  }

  async function refreshCommunity() {
    if (token) {
      const list = await serverListCommunity(token);
      if (list.ok) {
        setCommunity(list.data.items);
        return;
      }
    }
    setCommunity(loadCommunitySubjects());
  }

  // New-subject builder state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function persist(next: SubjectConfig[]) {
    setConfigs(next);
    saveMyConfigs(next);
    syncToServer(next);
    void reload();
  }

  function startCreating() {
    setCreating(true);
    setNewName('');
    setDraftQuestions([]);
    setQuestionDraft(null);
    setError(null);
  }

  function addDraftQuestion() {
    if (!questionDraft) return;
    const subjectId = slugify(newName || 'muj-predmet');
    const q = buildQuestion(subjectId, draftQuestions.length, questionDraft);
    if (!q) {
      setError('Otázka není kompletní — zkontrolujte text a alespoň 2 možnosti / vybranou správnou odpověď.');
      return;
    }
    setDraftQuestions((prev) => [...prev, q]);
    setQuestionDraft(null);
    setError(null);
  }

  function saveNewSubject() {
    setError(null);
    const name = newName.trim();
    if (name.length < 2) {
      setError('Zadejte název předmětu (alespoň 2 znaky).');
      return;
    }
    if (draftQuestions.length === 0) {
      setError('Přidejte alespoň jednu otázku.');
      return;
    }
    const subjectId = slugify(name);
    if (configs.some((c) => c.subject === subjectId)) {
      setError('Předmět s tímto názvem už máte vytvořený — zvolte jiný název.');
      return;
    }
    const config: SubjectConfig = {
      subject: subjectId,
      name,
      topics: [{ id: DEFAULT_TOPIC, name: 'Obecné' }],
      questions: draftQuestions,
    };
    persist([...configs, config]);
    setCreating(false);
    setMessage(`Předmět „${name}“ byl vytvořen s ${draftQuestions.length} otázkami.`);
  }

  async function deleteSubject(subjectId: string) {
    if (!window.confirm('Opravdu smazat tento předmět i se všemi otázkami?')) return;
    persist(configs.filter((c) => c.subject !== subjectId));
    if (username) {
      if (token) await serverWithdrawSubject(token, subjectId);
      unshareSubjectFromCommunity(username, subjectId);
    }
    void refreshCommunity();
  }

  async function shareSubject(config: SubjectConfig) {
    if (!username) return;
    if (token) {
      const result = await serverShareSubject(token, config);
      if (!result.ok) {
        setMessage(null);
        setError(`Sdílení se nezdařilo: ${result.error}`);
        return;
      }
    }
    shareSubjectToCommunity(username, config);
    await refreshCommunity();
    setMessage(`Předmět „${config.name}“ byl odeslán ke sdílení — po schválení administrátorem ho uvidí ostatní.`);
  }

  async function withdrawSubject(subjectId: string) {
    if (!username) return;
    if (token) await serverWithdrawSubject(token, subjectId);
    unshareSubjectFromCommunity(username, subjectId);
    await refreshCommunity();
  }

  function shareStatus(subjectId: string): { label: string; tone: string } | null {
    if (!username) return null;
    const entry = community.find((c) => c.author === username && c.subjectId === subjectId);
    if (!entry) return null;
    return entry.public
      ? { label: '🌍 Veřejné — vidí ho ostatní', tone: 'text-green-600 dark:text-green-400' }
      : { label: '⏳ Čeká na schválení administrátorem', tone: 'text-amber-600 dark:text-amber-400' };
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Moje otázky</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        Vytvořte si vlastní sadu otázek přímo v aplikaci a volitelně ji nasdílejte ostatním uživatelům — po
        schválení administrátorem se objeví v komunitní nabídce, odkud si ji každý může přidat.
      </p>

      {message && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
          {message}
        </div>
      )}

      {!creating && (
        <button
          type="button"
          onClick={startCreating}
          className="mb-6 min-h-[44px] rounded-lg bg-violet-600 px-5 text-sm font-medium text-white hover:bg-violet-700"
        >
          ➕ Nový předmět
        </button>
      )}

      {creating && (
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Název předmětu</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Např. Moje opakování — databáze"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          {draftQuestions.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {draftQuestions.map((q, i) => (
                <li key={q.id} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                  <span className="mr-2 text-gray-400">{i + 1}.</span>
                  {'question' in q ? q.question : 'statement' in q ? q.statement : q.id}
                  <button
                    type="button"
                    onClick={() => setDraftQuestions((prev) => prev.filter((_, j) => j !== i))}
                    className="float-right text-gray-400 hover:text-red-500"
                    title="Odebrat"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {questionDraft ? (
            <QuestionForm
              draft={questionDraft}
              onChange={setQuestionDraft}
              onCancel={() => setQuestionDraft(null)}
              onSubmit={addDraftQuestion}
            />
          ) : (
            <button
              type="button"
              onClick={() => setQuestionDraft(emptyQuestionDraft('single'))}
              className="min-h-[40px] rounded-lg border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-violet-400 hover:text-violet-600 dark:border-gray-600 dark:text-gray-400"
            >
              ➕ Přidat otázku ({draftQuestions.length})
            </button>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="min-h-[40px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-600 dark:border-gray-600 dark:text-gray-300"
            >
              Zahodit
            </button>
            <button
              type="button"
              onClick={saveNewSubject}
              className="min-h-[40px] rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700"
            >
              Uložit předmět
            </button>
          </div>
        </div>
      )}

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Vytvořené předměty
      </h2>
      {configs.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Zatím jste nevytvořili žádný vlastní předmět.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {configs.map((c) => {
            const status = shareStatus(c.subject);
            return (
              <li
                key={c.subject}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    ✍️ {c.name} <span className="font-normal text-gray-400">· {c.questions.length} otázek</span>
                  </p>
                  {status && <p className={`text-xs ${status.tone}`}>{status.label}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {status ? (
                    <button
                      type="button"
                      onClick={() => withdrawSubject(c.subject)}
                      className="min-h-[36px] rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:border-red-400 hover:text-red-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      Zrušit sdílení
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => shareSubject(c)}
                      className="min-h-[36px] rounded-lg border border-violet-400 px-3 text-sm font-medium text-violet-600 hover:bg-violet-50 dark:border-violet-600 dark:text-violet-300 dark:hover:bg-violet-900/30"
                    >
                      📤 Sdílet s ostatními
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteSubject(c.subject)}
                    className="min-h-[36px] rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:border-red-400 hover:text-red-600 dark:border-gray-600 dark:text-gray-300"
                  >
                    🗑 Smazat
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
