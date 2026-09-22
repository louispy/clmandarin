/**
 * Best result per deck, kept so a run can be measured against the person's own
 * history rather than an absolute standard.
 *
 * Comparing someone to themselves is the one form of encouragement that cannot
 * ring hollow — "best yet" is either true or it is not shown.
 */
const KEY = 'clm-quiz-best';

export interface QuizRecord {
  correct: number;
  total: number;
  /** Accuracy, stored so a 8/10 can be compared with a 16/20. */
  ratio: number;
  points: number;
  at: number;
}

type RecordMap = Record<string, QuizRecord>;

function readAll(): RecordMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecordMap) : {};
  } catch {
    return {};
  }
}

export function getBest(sourceId: string | null): QuizRecord | null {
  if (!sourceId) return null;
  return readAll()[sourceId] ?? null;
}

/**
 * Store the run if it beats what is already there. Returns how it compared, so
 * the results screen can say something true about it.
 */
export function recordRun(
  sourceId: string | null,
  run: { correct: number; total: number; points: number }
): { previous: QuizRecord | null; isBest: boolean; isFirst: boolean } {
  const ratio = run.total > 0 ? run.correct / run.total : 0;
  if (!sourceId) return { previous: null, isBest: false, isFirst: false };

  const all = readAll();
  const previous = all[sourceId] ?? null;
  const isFirst = previous === null;
  // A tie does not displace the earlier record but still counts as matching it.
  const isBest = isFirst || ratio > previous.ratio;

  if (isBest) {
    try {
      all[sourceId] = { correct: run.correct, total: run.total, ratio, points: run.points, at: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      // Private browsing throws; the run simply is not remembered.
    }
  }
  return { previous, isBest, isFirst };
}

export interface Verdict {
  headline: string;
  /** One forward-looking line; empty when there is nothing worth saying. */
  note: string;
  celebrate: boolean;
}

/**
 * An honest reading of the result.
 *
 * Deliberately not praise: Dweck's work is clear that encouragement a learner
 * finds non-credible does more harm than none at all, so nothing here claims
 * more than the numbers support. The tone lifts as the result does.
 *
 * Plain words on purpose. The audience is learning a language, and "strong
 * run", "getting there" and "early days" are all idioms that read as noise to
 * anyone who did not grow up with English.
 */
export function verdictFor(correct: number, total: number, missed: number): Verdict {
  const ratio = total > 0 ? correct / total : 0;
  if (total === 0) return { headline: 'No questions', note: '', celebrate: false };

  const note = missed === 0
    ? 'Nothing to review.'
    : `${missed} ${missed === 1 ? 'word' : 'words'} to review.`;

  if (ratio === 1) return { headline: 'Perfect!', note, celebrate: true };
  if (ratio >= 0.8) return { headline: 'Great work', note, celebrate: false };
  if (ratio >= 0.6) return { headline: 'Good work', note, celebrate: false };
  if (ratio >= 0.4) return { headline: 'Keep going', note, celebrate: false };
  return { headline: 'Keep studying', note, celebrate: false };
}
