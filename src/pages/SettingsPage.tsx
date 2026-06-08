import { ACCENT_COLORS, resolveEffectiveTheme, useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Settings } from '../lib/storage';

const THEME_OPTIONS: { id: Settings['theme']; label: string }[] = [
  { id: 'system', label: 'Podle systému' },
  { id: 'light', label: 'Světlý' },
  { id: 'dark', label: 'Tmavý' },
];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
          checked ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, accentColor, sound, autoAdvance, setTheme, setAccentColor, setSound, setAutoAdvance } =
    useSettingsStore();
  const { username, logout } = useAuthStore();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nastavení</h1>
        {username && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">👤 {username}</span>
            <button
              type="button"
              onClick={logout}
              className="min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:border-red-400 hover:text-red-600 dark:border-gray-600 dark:text-gray-300"
            >
              Odhlásit se
            </button>
          </div>
        )}
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Vzhled</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={theme === opt.id}
              onClick={() => setTheme(opt.id)}
              className={`min-h-[44px] rounded-lg border px-4 text-sm font-medium transition-colors ${
                theme === opt.id
                  ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                  : 'border-gray-300 text-gray-600 hover:border-violet-400 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="flex items-center px-2 text-xs text-gray-400 dark:text-gray-500">
            Aktuálně: {resolveEffectiveTheme(theme) === 'dark' ? 'tmavý' : 'světlý'}
          </span>
        </div>

        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Barevné schéma aplikace</p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={accentColor === c.id}
              onClick={() => setAccentColor(c.id)}
              title={c.label}
              className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
                accentColor === c.id
                  ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                  : 'border-gray-300 text-gray-600 hover:border-violet-400 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: c.swatch }} />
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Vzhled i barva se ukládají pro váš účet a projeví se i po dalším přihlášení.
        </p>
      </section>

      <section className="mb-6 flex flex-col gap-3">
        <h2 className="mb-0 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Procvičování</h2>
        <ToggleRow
          label="Automaticky pokračovat na další otázku"
          description="Po správné odpovědi vás aplikace ihned (po krátké pauze) pošle na další otázku, abyste procvičovali rychleji a neztráceli čas klikáním."
          checked={autoAdvance}
          onChange={setAutoAdvance}
        />
        <ToggleRow
          label="Zvuky"
          description="Přehrávat zvukovou odezvu při správné/špatné odpovědi."
          checked={sound}
          onChange={setSound}
        />
      </section>
    </div>
  );
}
