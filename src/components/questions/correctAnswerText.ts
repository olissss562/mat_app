import type { Question } from '../../types/config';

/** Produces a short human-readable description of the correct answer, shown in feedback for wrong answers. */
export function correctAnswerText(q: Question): string | undefined {
  switch (q.type) {
    case 'single':
    case 'multiple':
      return q.options.filter((o) => o.correct).map((o) => o.text).join(', ');
    case 'truefalse':
      return q.answer ? 'Pravda' : 'Nepravda';
    case 'matching':
      return q.pairs.map((p) => `${p.left} → ${p.right}`).join('; ');
    case 'ordering':
      return q.items.join(' → ');
    case 'numeric':
      return `${q.answer}${q.unit ? ` ${q.unit}` : ''}`;
    case 'categorize':
      return q.categories
        .map((cat) => `${cat}: ${q.items.filter((it) => it.category === cat).map((it) => it.text).join(', ')}`)
        .join(' | ');
    case 'gap':
      return q.blanks.map((b) => b.accept[0]).join(', ');
    case 'passage':
      return undefined;
  }
}
