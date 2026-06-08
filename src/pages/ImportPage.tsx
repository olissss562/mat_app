import { useRef, useState } from 'react';
import { validateSubjectConfig } from '../lib/validator';
import { loadImportedConfigs, saveImportedConfigs } from '../lib/storage';
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
    </div>
  );
}
