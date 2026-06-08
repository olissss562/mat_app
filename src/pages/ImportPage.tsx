import { useEffect, useMemo, useRef, useState } from 'react';
import { serverListCommunity } from '../lib/serverApi';
import { validateSubjectConfig } from '../lib/validator';
import {
  loadCommunitySubjects,
  loadImportedConfigs,
  saveImportedConfigs,
  type CommunitySubject,
} from '../lib/storage';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';
import type { SubjectConfig } from '../types/config';

interface ImportResult {
  fileName: string;
  ok: boolean;
  message: string;
  errors?: string[];
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const reload = useConfigStore((s) => s.reload);
  const { username, token } = useAuthStore();
  const [community, setCommunity] = useState<CommunitySubject[]>(() => loadCommunitySubjects());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [communityMessage, setCommunityMessage] = useState<string | null>(null);
  const [serverConnected, setServerConnected] = useState(false);

  async function refreshCommunity() {
    const result = await serverListCommunity(token);
    if (result.ok) {
      setCommunity(result.data.items);
      setServerConnected(true);
      return;
    }
    setServerConnected(false);
    setCommunity(loadCommunitySubjects());
  }

  useEffect(() => {
    void refreshCommunity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const publicShared = useMemo(
    () => community.filter((c) => c.public && c.author !== username),
    [community, username],
  );

  function addSharedSubject(entry: CommunitySubject) {
    const imported = loadImportedConfigs();
    const idx = imported.findIndex((c) => c.subject === entry.config.subject);
    if (idx >= 0) imported[idx] = entry.config;
    else imported.push(entry.config);
    saveImportedConfigs(imported);
    setAddedIds((prev) => new Set(prev).add(entry.id));
    setCommunityMessage(`Předmět „${entry.name}“ od uživatele ${entry.author} byl přidán mezi vaše importované předměty.`);
    void refreshCommunity(); // refresh in case other admins/users changed sharing meanwhile
    void reload();
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newResults: ImportResult[] = [];
    const imported = loadImportedConfigs();

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const validation = validateSubjectConfig(data, data?.subject);
        if (!validation.valid) {
          newResults.push({
            fileName: file.name,
            ok: false,
            message: 'Konfigurace je nevalidní a nebyla importována.',
            errors: validation.errors,
          });
          continue;
        }
        const config = data as SubjectConfig;
        const idx = imported.findIndex((c) => c.subject === config.subject);
        if (idx >= 0) imported[idx] = config;
        else imported.push(config);
        newResults.push({ fileName: file.name, ok: true, message: `Předmět "${config.name}" byl úspěšně importován.` });
      } catch (e) {
        newResults.push({
          fileName: file.name,
          ok: false,
          message: `Soubor se nepodařilo zpracovat jako JSON (${(e as Error).message}).`,
        });
      }
    }

    saveImportedConfigs(imported);
    setResults(newResults);
    if (newResults.some((r) => r.ok)) await reload();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Import obsahu</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        Nahrajte vlastní soubor s otázkami ve formátu JSON. Bude ověřen a propojen s existujícím obsahem.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`mb-6 flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <span className="text-3xl">📥</span>
        <p className="font-medium text-gray-700 dark:text-gray-200">Přetáhněte sem soubor JSON nebo klikněte pro výběr</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Formát musí odpovídat schématu předmětu (viz README)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 text-sm ${
                r.ok
                  ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300'
                  : 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300'
              }`}
            >
              <p className="font-medium">
                {r.ok ? '✅' : '❌'} {r.fileName}
              </p>
              <p>{r.message}</p>
              {r.errors && (
                <ul className="mt-1 list-inside list-disc">
                  {r.errors.slice(0, 8).map((e, j) => (
                    <li key={j}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-1 text-xl font-semibold">Sdílené otázky od ostatních</h2>
        <p className="mb-4 text-gray-500 dark:text-gray-400">
          Předměty, které ostatní uživatelé vytvořili v sekci „Moje otázky“ a administrátor je zveřejnil pro
          všechny. Přidáním si je zkopírujete mezi vlastní importované předměty.
        </p>
        <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
          {serverConnected
            ? '🌐 Nabídka se načítá ze serveru — funguje napříč zařízeními a se všemi přáteli.'
            : 'ℹ️ Server pro sdílení mezi zařízeními zatím není nakonfigurovaný — zobrazuje se pouze nabídka uložená v tomto prohlížeči.'}
        </p>

        {communityMessage && (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
            {communityMessage}
          </div>
        )}

        {publicShared.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Zatím tu nejsou žádné veřejně sdílené předměty.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {publicShared.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    🌍 {entry.name}{' '}
                    <span className="font-normal text-gray-400">
                      · od {entry.author} · {entry.config.questions.length} otázek
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addSharedSubject(entry)}
                  disabled={addedIds.has(entry.id)}
                  className="min-h-[36px] rounded-lg border border-violet-400 px-3 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-600 dark:text-violet-300 dark:hover:bg-violet-900/30"
                >
                  {addedIds.has(entry.id) ? '✅ Přidáno' : '➕ Přidat'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
