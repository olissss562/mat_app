import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';

// Shows a sticky "you have a quiz in progress" bar whenever a session is active but the user
// has navigated away from the quiz (e.g. to peek at Settings or Stats). The session store is
// kept entirely in memory and is NOT reset on navigation, so clicking "Pokračovat" simply
// routes back to /quiz and the learner picks up exactly where they left off.
export default function ResumeQuizBanner() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = useSessionStore((s) => s.active);
  const itemsLength = useSessionStore((s) => s.items.length);
  const currentIndex = useSessionStore((s) => s.currentIndex);
  const reset = useSessionStore((s) => s.reset);

  // Hide while actually on the quiz/results screens, or when there's nothing to resume.
  if (!active || itemsLength === 0) return null;
  if (pathname === '/quiz' || pathname === '/results') return null;

  return (
    <div className="sticky top-0 z-30 border-b border-violet-200 bg-violet-50/95 backdrop-blur dark:border-violet-800 dark:bg-violet-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-medium text-violet-800 dark:text-violet-200">
          <span aria-hidden>▶</span>
          Máte rozpracovaný kvíz — otázka {Math.min(currentIndex + 1, itemsLength)} / {itemsLength}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/quiz')}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            Pokračovat
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg border border-violet-300 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/40"
            title="Zahodit rozpracovaný kvíz"
          >
            Ukončit
          </button>
        </div>
      </div>
    </div>
  );
}
