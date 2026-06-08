export interface Progress {
  repetitions: number; // consecutive correct (grade>=3) reps
  easeFactor: number; // EF, starts 2.5, min 1.3
  interval: number; // days until next due
  due: number; // epoch ms
  lastReviewed: number; // epoch ms
  totalSeen: number;
  totalCorrect: number;
  mastery: number; // 0..100, recomputed each update
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function createInitialProgress(now: number = Date.now()): Progress {
  return {
    repetitions: 0,
    easeFactor: 2.5,
    interval: 0,
    due: now,
    lastReviewed: 0,
    totalSeen: 0,
    totalCorrect: 0,
    mastery: 0,
  };
}

/** Maps a grade (0..5) outcome bucket according to the spec's mapping rules. */
export function gradeToSm2(grade: number): number {
  return Math.max(0, Math.min(5, Math.round(grade)));
}

export function computeMastery(p: Pick<Progress, 'repetitions' | 'totalSeen' | 'totalCorrect' | 'interval'>): number {
  const repFactor = Math.min(1, p.repetitions / 5);
  const accFactor = p.totalSeen > 0 ? p.totalCorrect / p.totalSeen : 0;
  const intervalFactor = Math.min(1, p.interval / 30);
  const mastery = 100 * (0.5 * repFactor + 0.3 * accFactor + 0.2 * intervalFactor);
  return Math.round(mastery);
}

export function updateProgress(prev: Progress, q: number, now: number = Date.now()): Progress {
  let { repetitions, easeFactor, interval } = prev;

  if (q >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const totalSeen = prev.totalSeen + 1;
  const totalCorrect = prev.totalCorrect + (q >= 3 ? 1 : 0);
  const due = now + interval * DAY_MS;

  const next: Progress = {
    repetitions,
    easeFactor,
    interval,
    due,
    lastReviewed: now,
    totalSeen,
    totalCorrect,
    mastery: 0,
  };
  next.mastery = computeMastery(next);
  return next;
}

export function isDue(p: Progress | undefined, now: number = Date.now()): boolean {
  if (!p || p.totalSeen === 0) return true;
  return now >= p.due;
}

export function getRetrievability(p: Progress, now: number = Date.now()): number {
  if (p.interval <= 0) return 0;
  const elapsedDays = (now - p.lastReviewed) / DAY_MS;
  return Math.exp(-elapsedDays / p.interval);
}

/** Average mastery across a set of question ids; unseen questions count as 0. */
export function aggregateMastery(
  questionIds: string[],
  progressMap: Record<string, Progress>,
): number {
  if (questionIds.length === 0) return 0;
  const sum = questionIds.reduce((acc, id) => acc + (progressMap[id]?.mastery ?? 0), 0);
  return Math.round(sum / questionIds.length);
}
