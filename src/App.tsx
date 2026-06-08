import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import GroupPage from './pages/GroupPage';
import SubjectPage from './pages/SubjectPage';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage';
import StatsPage from './pages/StatsPage';
import ImportPage from './pages/ImportPage';
import SettingsPage from './pages/SettingsPage';
import MyQuestionsPage from './pages/MyQuestionsPage';
import AdminPage from './pages/AdminPage';
import PromptsPage from './pages/PromptsPage';
import LoginPage from './pages/LoginPage';
import { resolveEffectiveTheme, useSettingsStore } from './store/useSettingsStore';
import { useAuthStore } from './store/useAuthStore';
import { startUserDataSync, stopUserDataSync } from './lib/userDataSync';

export default function App() {
  const theme = useSettingsStore((s) => s.theme);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { username, ready, init } = useAuthStore();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    init();
  }, [init]);

  // Cross-device sync: when signed in with a server session, pull the user's saved progress,
  // stats and settings, merge them with this device, and mirror future changes back up.
  useEffect(() => {
    if (!token) {
      stopUserDataSync();
      return;
    }
    void startUserDataSync(token, () => {
      // A pull may have replaced the stored settings (theme/accent/etc.) — re-read them so the
      // UI updates immediately.
      useSettingsStore.getState().reloadFromStorage();
    });
    return () => stopUserDataSync();
  }, [token]);

  useEffect(() => {
    const apply = () => {
      const effective = resolveEffectiveTheme(theme);
      document.documentElement.classList.toggle('dark', effective === 'dark');
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  // Apply the user's chosen accent color by toggling a `theme-<color>` class on <html>;
  // the actual color values live in CSS variables (see index.css) that Tailwind's
  // "violet" shade is wired to (tailwind.config.js), so no component classes need to change.
  useEffect(() => {
    const root = document.documentElement;
    const classes = Array.from(root.classList).filter((c) => c.startsWith('theme-'));
    classes.forEach((c) => root.classList.remove(c));
    root.classList.add(`theme-${accentColor}`);
  }, [accentColor]);

  if (!ready) {
    return null;
  }

  if (!username) {
    return (
      <HashRouter>
        <LoginPage />
        <Analytics />
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/group/:id" element={<GroupPage />} />
          <Route path="/subject/:id" element={<SubjectPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/my-questions" element={<MyQuestionsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/prompts" element={<PromptsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
      <Analytics />
    </HashRouter>
  );
}
