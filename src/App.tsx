import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import SubjectPage from './pages/SubjectPage';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage';
import StatsPage from './pages/StatsPage';
import ImportPage from './pages/ImportPage';
import { resolveEffectiveTheme, useSettingsStore } from './store/useSettingsStore';

export default function App() {
  const theme = useSettingsStore((s) => s.theme);

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

  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/subject/:id" element={<SubjectPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
