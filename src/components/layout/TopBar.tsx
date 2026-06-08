import { Link, useLocation } from 'react-router-dom';
import { resolveEffectiveTheme, useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';

const NAV = [
  { to: '/', label: 'Domů' },
  { to: '/stats', label: 'Statistiky' },
  { to: '/import', label: 'Import' },
  { to: '/my-questions', label: 'Moje otázky' },
  { to: '/prompts', label: 'Prompty pro AI' },
  { to: '/settings', label: 'Nastavení' },
];

export default function TopBar() {
  const location = useLocation();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const { username, isAdmin, logout } = useAuthStore();
  const nav = isAdmin ? [...NAV, { to: '/admin', label: '🛠 Admin' }] : NAV;

  function toggleTheme() {
    const effective = resolveEffectiveTheme(theme);
    setTheme(effective === 'dark' ? 'light' : 'dark');
  }

  return (
    <header className="hidden border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-700 dark:bg-gray-900/80 sm:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          🎓 Question mark
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === item.to
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            aria-pressed={resolveEffectiveTheme(theme) === 'dark'}
            onClick={toggleTheme}
            className="ml-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            title="Přepnout motiv"
          >
            {resolveEffectiveTheme(theme) === 'dark' ? '☀️' : '🌙'}
          </button>
          {username && (
            <span className="ml-2 flex items-center gap-2 border-l border-gray-200 pl-2 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">👤 {username}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                title="Odhlásit se"
              >
                Odhlásit
              </button>
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
