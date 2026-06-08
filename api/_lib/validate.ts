// Local copy of src/lib/validator.ts — see configTypes.ts for why this is duplicated
// rather than imported across the /api boundary. Keep in sync with the client version.

import type {
  CategorizeQuestion,
  GapQuestion,
  MatchingQuestion,
  MultipleQuestion,
  NumericQuestion,
  OrderingQuestion,
  PassageQuestion,
  Question,
  SingleQuestion,
  TrueFalseQuestion,
} from './configTypes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateQuestionShape(
  q: any,
  topicIds: Set<string>,
  requireIdAndTopic: boolean,
  pathLabel: string,
): string[] {
  const errors: string[] = [];

  if (requireIdAndTopic) {
    if (!q.id || typeof q.id !== 'string') {
      errors.push(`${pathLabel}: chybí nebo neplatné "id"`);
    }
    if (!q.topic || !topicIds.has(q.topic)) {
      errors.push(`${pathLabel}: téma "${q.topic}" neexistuje`);
    }
  }

  switch (q.type) {
    case 'single': {
      const sq = q as SingleQuestion;
      if (!Array.isArray(sq.options) || sq.options.length < 2) {
        errors.push(`${pathLabel}: "single" musí mít alespoň 2 možnosti`);
      } else {
        const correctCount = sq.options.filter((o) => o.correct).length;
        if (correctCount !== 1) {
          errors.push(`${pathLabel}: "single" musí mít právě jednu správnou možnost`);
        }
      }
      break;
    }
    case 'multiple': {
      const mq = q as MultipleQuestion;
      if (!Array.isArray(mq.options) || mq.options.length < 2) {
        errors.push(`${pathLabel}: "multiple" musí mít alespoň 2 možnosti`);
      } else {
        const correctCount = mq.options.filter((o) => o.correct).length;
        if (correctCount < 1) {
          errors.push(`${pathLabel}: "multiple" musí mít alespoň jednu správnou možnost`);
        }
      }
      break;
    }
    case 'truefalse': {
      const tf = q as TrueFalseQuestion;
      if (typeof tf.answer !== 'boolean') {
        errors.push(`${pathLabel}: "truefalse" musí mít boolean "answer"`);
      }
      if (!tf.statement) {
        errors.push(`${pathLabel}: "truefalse" musí mít "statement"`);
      }
      break;
    }
    case 'matching': {
      const mq = q as MatchingQuestion;
      if (!Array.isArray(mq.pairs) || mq.pairs.length < 2) {
        errors.push(`${pathLabel}: "matching" musí mít alespoň 2 páry`);
      } else if (mq.pairs.some((p) => !p.left || !p.right)) {
        errors.push(`${pathLabel}: "matching" obsahuje prázdné položky`);
      }
      break;
    }
    case 'ordering': {
      const oq = q as OrderingQuestion;
      if (!Array.isArray(oq.items) || oq.items.length < 2) {
        errors.push(`${pathLabel}: "ordering" musí mít alespoň 2 položky`);
      }
      break;
    }
    case 'numeric': {
      const nq = q as NumericQuestion;
      if (typeof nq.answer !== 'number' || Number.isNaN(nq.answer)) {
        errors.push(`${pathLabel}: "numeric" musí mít číselnou "answer"`);
      }
      if (nq.tolerance !== undefined && (typeof nq.tolerance !== 'number' || nq.tolerance < 0)) {
        errors.push(`${pathLabel}: "tolerance" musí být >= 0`);
      }
      break;
    }
    case 'categorize': {
      const cq = q as CategorizeQuestion;
      if (!Array.isArray(cq.categories) || cq.categories.length < 2) {
        errors.push(`${pathLabel}: "categorize" musí mít alespoň 2 kategorie`);
      } else if (!Array.isArray(cq.items) || cq.items.length < 1) {
        errors.push(`${pathLabel}: "categorize" musí mít alespoň 1 položku`);
      } else {
        const catSet = new Set(cq.categories);
        for (const item of cq.items) {
          if (!catSet.has(item.category)) {
            errors.push(`${pathLabel}: položka "${item.text}" má neznámou kategorii "${item.category}"`);
          }
        }
      }
      break;
    }
    case 'gap': {
      const gq = q as GapQuestion;
      if (!gq.text || typeof gq.text !== 'string') {
        errors.push(`${pathLabel}: "gap" musí mít "text"`);
      } else {
        const placeholders = new Set<string>();
        const re = /\{\{(\d+)\}\}/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(gq.text)) !== null) {
          placeholders.add(m[1]);
        }
        if (!Array.isArray(gq.blanks) || placeholders.size !== gq.blanks.length) {
          errors.push(`${pathLabel}: počet "{{n}}" zástupných symbolů (${placeholders.size}) neodpovídá počtu "blanks" (${gq.blanks?.length ?? 0})`);
        } else if (gq.blanks.some((b) => !Array.isArray(b.accept) || b.accept.length === 0)) {
          errors.push(`${pathLabel}: každá mezera musí mít neprázdné pole "accept"`);
        }
      }
      break;
    }
    case 'passage': {
      const pq = q as PassageQuestion;
      if (!pq.passage || typeof pq.passage !== 'string') {
        errors.push(`${pathLabel}: "passage" musí mít text úryvku`);
      }
      if (!Array.isArray(pq.questions) || pq.questions.length < 1) {
        errors.push(`${pathLabel}: "passage" musí mít alespoň jednu podotázku`);
      } else {
        pq.questions.forEach((sub, i) => {
          errors.push(
            ...validateQuestionShape(
              sub,
              topicIds,
              false,
              `${pathLabel} > podotázka ${i}`,
            ),
          );
        });
      }
      break;
    }
    default:
      errors.push(`${pathLabel}: neznámý typ otázky "${q.type}"`);
  }

  return errors;
}

export function validateSubjectConfig(data: any, expectedId: string): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Konfigurace není platný objekt'] };
  }

  if (data.subject !== expectedId) {
    errors.push(`Pole "subject" ("${data.subject}") neodpovídá očekávanému id "${expectedId}"`);
  }

  if (!Array.isArray(data.topics) || data.topics.length === 0) {
    errors.push('Chybí pole "topics" nebo je prázdné');
  }
  if (!Array.isArray(data.questions)) {
    errors.push('Chybí pole "questions"');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const topicIds = new Set<string>(data.topics.map((t: any) => t.id));
  const seenIds = new Set<string>();

  for (const q of data.questions as Question[]) {
    if (!q.id) {
      errors.push('Otázka bez "id"');
      continue;
    }
    if (seenIds.has(q.id)) {
      errors.push(`Duplicitní id otázky: "${q.id}"`);
    }
    seenIds.add(q.id);
    errors.push(...validateQuestionShape(q, topicIds, true, `Otázka "${q.id}"`));
  }

  return { valid: errors.length === 0, errors };
}
