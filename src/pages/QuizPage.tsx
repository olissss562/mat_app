import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import QuestionRenderer from '../components/questions/QuestionRenderer';
import Feedback from '../components/Feedback';
import ProgressBar from '../components/ProgressBar';
import { correctAnswerText } from '../components/questions/correctAnswerText';
import { loadBookmarks, saveBookmarks } from '../lib/storage';
import { isOverridable } from '../lib/questionOverrides';
import QuestionEditModal from '../components/QuestionEditModal';

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function QuizPage() {
  const navigate = useNavigate();
  const {
    active,
    mode,
    items,
    currentIndex,
    examDeadline,
    speedDeadline,
    streak,
    emptyReason,
    setAnswer,
    reveal,
    next,
    skip,
    finish,
  } = useSessionStore();

  const autoAdvance = useSettingsStore((s) => s.autoAdvance);
  const [, forceTick] = useState(0);
  const [bookmarks, setBookmarks] = useState<string[]>(() => loadBookmarks());
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (!active && items.length === 0 && !emptyReason) {
      navigate('/');
    }
  }, [active, items.length, emptyReason, navigate]);

  const item = items[currentIndex];

  // Tick every 250ms for timers
  useEffect(() => {
    if (mode !== 'exam' && mode !== 'speed') return;
    const id = setInterval(() => forceTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [mode]);

  // Exam timer expiry
  useEffect(() => {
    if (mode === 'exam' && examDeadline !== null && Date.now() >= examDeadline && active) {
      finish();
      navigate('/results');
    }
  }, [mode, examDeadline, active, finish, navigate]);

  // Speed per-question timeout
  useEffect(() => {
    if (mode !== 'speed' || !item || item.revealed) return;
    if (speedDeadline !== null && Date.now() >= speedDeadline) {
      skip();
    }
  }, [mode, item, speedDeadline, skip]);

  // Navigate to results once session ends
  useEffect(() => {
    if (!active && items.length > 0 && currentIndex === items.length - 1 && items[items.length - 1]?.revealed) {
      navigate('/results');
    }
  }, [active, items, currentIndex, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!item) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!item.revealed) {
          if (mode === 'exam') {
            handleNext();
          } else {
            reveal();
          }
        } else {
          handleNext();
        }
      } else if (e.key === ' ' || e.key === 'ArrowRight') {
        if (item.revealed || mode === 'exam') {
          e.preventDefault();
          handleNext();
        }
      } else if (e.key.toLowerCase() === 'b') {
        toggleBookmark();
      } else if (e.key === 'Escape') {
        navigate(`/subject/${item.subjectId}`);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, mode]);

  // Auto-advance: when the user answers correctly (and the setting is enabled), jump to the
  // next question automatically after a short pause so they can still glimpse the feedback.
  // Skipped in exam mode (no immediate feedback there) and when the answer was wrong, so the
  // learner has time to read the explanation.
  useEffect(() => {
    if (!item || !item.revealed || item.isCorrect !== true || mode === 'exam' || !autoAdvance) return;
    const timer = setTimeout(() => {
      handleNext();
    }, 1100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.revealed, item?.isCorrect, currentIndex, autoAdvance, mode]);

  if (emptyReason) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="mb-4 text-lg text-gray-700 dark:text-gray-300">{emptyReason}</p>
        <button
          onClick={() => navigate('/')}
          className="min-h-[44px] rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-700"
        >
          Domů
        </button>
      </div>
    );
  }

  if (!item) return null;

  function handleNext() {
    if (mode === 'exam') {
      if (currentIndex < items.length - 1) {
        next();
      } else {
        finish();
        navigate('/results');
      }
    } else {
      next();
      if (currentIndex >= items.length - 1) {
        navigate('/results');
      }
    }
  }

  function toggleBookmark() {
    if (!item) return;
    const id = item.question.id;
    setBookmarks((prev) => {
      const next2 = prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id];
      saveBookmarks(next2);
      return next2;
    });
  }

  const isBookmarked = bookmarks.includes(item.question.id);
  const showFeedback = item.revealed && mode !== 'exam';
  const examTimeLeft = mode === 'exam' && examDeadline !== null ? examDeadline - Date.now() : null;
  const speedTimeLeft = mode === 'speed' && speedDeadline !== null ? speedDeadline - Date.now() : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          Otázka {currentIndex + 1} / {items.length}
        </span>
        <div className="flex items-center gap-3">
          {mode === 'speed' && <span>🔥 Série: {streak}</span>}
          {examTimeLeft !== null && <span className="font-mono">⏱ {formatTime(examTimeLeft)}</span>}
          {speedTimeLeft !== null && !item.revealed && <span className="font-mono">⏱ {formatTime(speedTimeLeft)}</span>}
          {isOverridable(item.question) && (
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              title="Otázka se zdá špatně? Upravit správnou odpověď"
              className="text-gray-400 hover:text-violet-500 dark:hover:text-violet-400"
            >
              ⚙️
            </button>
          )}
          <button
            type="button"
            aria-pressed={isBookmarked}
            onClick={toggleBookmark}
            title="Záložka (B)"
            className={`text-lg ${isBookmarked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-400'}`}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/subject/${item.subjectId}`)}
            title="Ukončit (Esc)"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>

      <ProgressBar value={(currentIndex / items.length) * 100} className="mb-6" />

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <QuestionRenderer
          question={item.question}
          answer={item.answer}
          onChange={setAnswer}
          revealed={showFeedback}
        />
        {showFeedback && item.isCorrect !== null && (
          <Feedback
            isCorrect={item.isCorrect}
            explanation={item.question.type !== 'passage' ? item.question.explanation : undefined}
            source={item.question.type !== 'passage' ? item.question.source : undefined}
            correctAnswerText={item.question.type !== 'passage' ? correctAnswerText(item.question) : undefined}
          />
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        {!item.revealed && mode !== 'exam' && (
          <button
            type="button"
            onClick={skip}
            className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300"
          >
            Přeskočit
          </button>
        )}
        {!item.revealed ? (
          <button
            type="button"
            onClick={mode === 'exam' ? handleNext : reveal}
            className="min-h-[44px] rounded-lg bg-violet-600 px-6 py-2 font-medium text-white hover:bg-violet-700"
          >
            {mode === 'exam' ? 'Další' : 'Zkontrolovat'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="min-h-[44px] rounded-lg bg-violet-600 px-6 py-2 font-medium text-white hover:bg-violet-700"
          >
            {currentIndex < items.length - 1 ? 'Další' : 'Dokončit'}
          </button>
        )}
      </div>
      <p className="hidden mt-2 text-xs text-gray-400 sm:block">
        Klávesy: 1–9 výběr, Enter zkontrolovat/další, →/mezerník další, B záložka, Esc konec
      </p>

      {editorOpen && (
        <QuestionEditModal
          question={item.question}
          onClose={() => setEditorOpen(false)}
          onSaved={() => forceTick((t) => t + 1)}
        />
      )}
    </div>
  );
}
