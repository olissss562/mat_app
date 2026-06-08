import { useState } from 'react';

// Ready-to-copy prompts for generating question sets with an AI (Gemini, ChatGPT, Claude, ...).
// The user copies one prompt, fills in their topic, pastes it into the AI, imports the
// resulting JSON via the "Import" page (or pastes individual questions into "Moje otázky").
// Three sizes match how broad the topic is — broader topics warrant more questions.

interface PromptSpec {
  id: string;
  badge: string;
  title: string;
  scopeHint: string;
  count: number;
  topicCount: string;
}

const SPECS: PromptSpec[] = [
  {
    id: 'short',
    badge: '🟢 Krátké téma',
    title: '15 otázek',
    scopeHint: 'úzké, dobře ohraničené téma (např. "Bublinkové třídění" nebo "Druhy datových typů v Pythonu")',
    count: 15,
    topicCount: '2–4',
  },
  {
    id: 'medium',
    badge: '🟡 Střední téma',
    title: '30 otázek',
    scopeHint: 'středně široké téma (např. "Relační databáze a SQL" nebo "Operační paměť počítače")',
    count: 30,
    topicCount: '4–6',
  },
  {
    id: 'long',
    badge: '🔴 Dlouhé téma',
    title: '50 otázek',
    scopeHint: 'široké maturitní téma/okruh (např. "Síťové modely a protokoly" nebo "Objektově orientované programování")',
    count: 50,
    topicCount: '6–8',
  },
];

function buildPrompt(spec: PromptSpec): string {
  return `Jsi odborník na tvorbu studijních materiálů a generuješ cvičné otázky pro webovou
aplikaci "Maturita Trenažér". Tvým úkolem je vytvořit sadu PŘESNĚ ${spec.count} otázek
pro toto téma:

TÉMA: [DOPLŇTE SVÉ TÉMA — ${spec.scopeHint}]
ID PŘEDMĚTU (pole "subject"): [krátké anglické id bez diakritiky a mezer, např. "site" nebo "sql-zaklady"]
NÁZEV PŘEDMĚTU PRO ZOBRAZENÍ (pole "name"): [čitelný název tématu]

Výstupem MUSÍ být JEDEN validní JSON objekt přesně podle schématu níže — ŽÁDNÝ úvodní
ani závěrečný text, ŽÁDNÉ markdown bloky s vysvětlením, JEN samotný JSON. Soubor se bude
automaticky importovat a validovat, takže formát musí sedět do posledního detailu.

============================================================
STRUKTURA SOUBORU
============================================================
{
  "subject": "id-predmetu",
  "name": "Čitelný název předmětu",
  "topics": [
    { "id": "kratke-id-podtematu", "name": "Čitelný název podtématu" }
    // rozděl téma na ${spec.topicCount} logických podtémat, každé "id" jedinečné,
    // krátké, bez diakritiky a mezer (kebab-case)
  ],
  "questions": [ /* přesně ${spec.count} otázek, viz níže — KAŽDÁ musí mít "topic"
                    odkazující na existující "id" z pole "topics" */ ]
}

============================================================
SPOLEČNÁ POLE KAŽDÉ OTÁZKY
============================================================
  "id"          POVINNÉ — globálně jedinečné, formát "id-predmetu-001", "id-predmetu-002", ...
                (postupně číslováno, 3místné číslo s nulami na začátku)
  "type"        POVINNÉ — jeden z typů níže
  "topic"       POVINNÉ — musí odpovídat "id" z pole "topics"
  "difficulty"  nepovinné, 1–3 (1 = lehká, 3 = těžká); rozumně promíchej
  "explanation" DOPORUČENO u každé otázky — 2–5 vět vysvětlujících správnou odpověď,
                vhodné pro maturitní přípravu
  "tags"        nepovinné pole klíčových slov

============================================================
POUŽIJ TYTO TYPY OTÁZEK (rozumně namixuj, hlavně "single", "multiple" a "truefalse"):
============================================================

--- "single" — právě JEDNA správná odpověď ---
{
  "id": "id-predmetu-001", "type": "single", "topic": "id-podtematu",
  "explanation": "Proč je správná odpověď správná a ostatní ne.",
  "question": "Znění otázky?",
  "options": [
    { "text": "Možnost A", "correct": false },
    { "text": "Možnost B", "correct": true },
    { "text": "Možnost C", "correct": false },
    { "text": "Možnost D", "correct": false }
  ]
}
Pravidla: 3–5 možností, PRÁVĚ JEDNA "correct": true.

--- "multiple" — JEDNA NEBO VÍCE správných odpovědí ---
Stejně jako "single", ale "type": "multiple" a "correct": true mají 2–3 možnosti.
Do otázky napiš jasně, že jde o více odpovědí (např. "Vyberte všechny pravdivé možnosti:").

--- "truefalse" — Pravda / Nepravda ---
{
  "id": "id-predmetu-003", "type": "truefalse", "topic": "id-podtematu",
  "explanation": "Proč je tvrzení pravdivé/nepravdivé.",
  "statement": "Tvrzení, o kterém se rozhoduje (POZOR: pole se jmenuje \\"statement\\", NE \\"question\\").",
  "answer": true
}

--- "numeric" — číselná odpověď ---
{
  "id": "id-predmetu-004", "type": "numeric", "topic": "id-podtematu",
  "explanation": "Postup výpočtu a proč vyjde právě tato hodnota.",
  "question": "Znění zadání vyžadující číselnou odpověď.",
  "answer": 42,
  "tolerance": 0
}
Pravidla: "answer" je číslo, "tolerance" >= 0 (povolená odchylka; 0, pokud má být přesné).

============================================================
DŮLEŽITÉ POŽADAVKY NA OBSAH
============================================================
- Vygeneruj PŘESNĚ ${spec.count} otázek, žádné méně, žádné více.
- Otázky musí být věcně správné, srozumitelné a odpovídat úrovni české maturitní zkoušky.
- Rozlož otázky rovnoměrně mezi všechna podtémata a namíchej obtížnosti (difficulty 1–3).
- Každé "id" otázky musí být jedinečné a navazovat řadou (-001, -002, -003, ...).
- Nepoužívej pole "image" ani "code"/"language", pokud to není pro otázku nezbytné.
- Piš v češtině, bez pravopisných chyb a bez duplicitních otázek.

Než odpovíš, ověř si, že máš platný JSON (žádné chybějící čárky, uvozovky apod.) a že
počet položek v poli "questions" je přesně ${spec.count}.`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can still select & copy manually */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`min-h-[40px] rounded-lg border px-4 text-sm font-medium transition-colors ${
        copied
          ? 'border-green-400 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300'
          : 'border-violet-400 text-violet-600 hover:bg-violet-50 dark:border-violet-600 dark:text-violet-300 dark:hover:bg-violet-900/30'
      }`}
    >
      {copied ? '✅ Zkopírováno' : '📋 Zkopírovat prompt'}
    </button>
  );
}

export default function PromptsPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Prompty pro tvorbu otázek pomocí AI</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        Nejrychlejší způsob, jak si vytvořit vlastní sadu otázek: zkopírujte hotový prompt, doplňte
        do něj své téma, vložte ho do AI (Gemini, ChatGPT, Claude, ...) a nechte si vygenerovat
        hotový JSON soubor. Ten pak nahrajete na stránce <strong>Import</strong> — a otázky jsou
        ihned k procvičování (a případně i ke sdílení s ostatními přes <strong>Moje otázky</strong>).
      </p>

      <ol className="mb-8 flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        <li>1. Vyberte velikost podle toho, jak široké je vaše téma, a zkopírujte prompt.</li>
        <li>2. V promptu doplňte text v hranatých závorkách <code>[...]</code> — hlavně své téma.</li>
        <li>3. Vložte prompt do AI a počkejte na vygenerovaný JSON.</li>
        <li>4. Zkopírovaný JSON uložte jako soubor <code>.json</code> a nahrajte ho na stránce „Import".</li>
        <li>5. Hotovo — otázky se objeví mezi vašimi předměty a můžete je rovnou procvičovat.</li>
      </ol>

      <div className="flex flex-col gap-4">
        {SPECS.map((spec) => {
          const prompt = buildPrompt(spec);
          const open = openId === spec.id;
          return (
            <section
              key={spec.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{spec.badge}</span>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {spec.title} <span className="font-normal text-gray-400">— pro {spec.scopeHint.split(' (')[0]}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={prompt} />
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : spec.id)}
                    className="min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300"
                  >
                    {open ? 'Skrýt náhled' : 'Zobrazit náhled'}
                  </button>
                </div>
              </div>
              {open && (
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-700 dark:bg-gray-950 dark:text-gray-300">
                  {prompt}
                </pre>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
        💡 Potřebujete pokrýt opravdu celé velké téma se všemi typy otázek (matching, ordering,
        kód, ...)? Podívejte se na podrobnější prompt v souboru{' '}
        <code>docs/gemini-question-prompt.md</code> — ten popisuje úplně všech 9 typů otázek a
        je vhodný, když chcete co nejpestřejší a nejúplnější sadu pro jedno velké téma.
      </p>
    </div>
  );
}
