import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginPage() {
  const { login, register, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    clearError();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = mode === 'login' ? await login(username, password) : await register(username, password);
    if (ok) {
      setUsername('');
      setPassword('');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h1 className="mb-1 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">🎓 Question mark</h1>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Přihlaste se, ať máte svůj pokrok a statistiky jen pro sebe.
        </p>

        <div className="mb-4 flex rounded-lg border border-gray-300 p-1 dark:border-gray-600">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`min-h-[40px] flex-1 rounded-md text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-violet-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            Přihlásit se
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`min-h-[40px] flex-1 rounded-md text-sm font-medium transition-colors ${
              mode === 'register'
                ? 'bg-violet-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            Vytvořit účet
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Jméno
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-violet-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Heslo
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-violet-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 min-h-[44px] rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition-colors hover:bg-violet-700"
          >
            {mode === 'login' ? 'Přihlásit se' : 'Vytvořit účet a pokračovat'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          Pozn.: jde o jednoduché lokální přihlášení bez serveru — slouží jen k oddělení pokroku
          jednotlivých uživatelů na sdíleném zařízení, nikoli jako bezpečnostní ochrana.
        </p>
      </div>
    </div>
  );
}
