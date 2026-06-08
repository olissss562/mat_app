import type { Manifest, Question, SubjectConfig, SubjectRef } from '../types/config';
import { validateSubjectConfig } from './validator';
import { loadImportedConfigs } from './storage';

export interface LoadedSubject {
  ref: SubjectRef;
  config: SubjectConfig;
  flatQuestions: Question[]; // includes flattened passage sub-questions
}

export interface InvalidSubject {
  ref: SubjectRef;
  errors: string[];
}

export interface ConfigLoadResult {
  subjects: LoadedSubject[];
  invalid: InvalidSubject[];
  questionIndex: Map<string, { subjectId: string; question: Question }>;
}

function basePath(): string {
  return import.meta.env.BASE_URL;
}

/** Flattens passage sub-questions into standalone questions with derived ids/topics. */
export function flattenQuestions(questions: Question[]): Question[] {
  const result: Question[] = [];
  for (const q of questions) {
    result.push(q);
    if (q.type === 'passage') {
      q.questions.forEach((sub, i) => {
        result.push({
          ...sub,
          id: `${q.id}-sub-${i}`,
          topic: q.topic,
        } as Question);
      });
    }
  }
  return result;
}

async function fetchSubjectConfig(ref: SubjectRef): Promise<{ data: any } | { error: string }> {
  try {
    const res = await fetch(`${basePath()}configs/${ref.file}`);
    if (!res.ok) {
      return { error: `Soubor "${ref.file}" se nepodařilo načíst (HTTP ${res.status})` };
    }
    const data = await res.json();
    return { data };
  } catch (e) {
    return { error: `Soubor "${ref.file}" se nepodařilo načíst (${(e as Error).message})` };
  }
}

export async function loadAllConfigs(): Promise<ConfigLoadResult> {
  const subjects: LoadedSubject[] = [];
  const invalid: InvalidSubject[] = [];

  let manifest: Manifest;
  try {
    const res = await fetch(`${basePath()}configs/manifest.json`);
    manifest = await res.json();
  } catch (e) {
    return { subjects: [], invalid: [], questionIndex: new Map() };
  }

  const bySubjectId = new Map<string, LoadedSubject>();

  for (const ref of manifest.subjects) {
    const result = await fetchSubjectConfig(ref);
    if ('error' in result) {
      invalid.push({ ref, errors: [result.error] });
      continue;
    }
    const validation = validateSubjectConfig(result.data, ref.id);
    if (!validation.valid) {
      invalid.push({ ref, errors: validation.errors });
      continue;
    }
    const config = result.data as SubjectConfig;
    bySubjectId.set(ref.id, {
      ref,
      config,
      flatQuestions: flattenQuestions(config.questions),
    });
  }

  // Merge imported configs from localStorage; imported overrides bundled with same subject id
  const imported = loadImportedConfigs();
  for (const config of imported) {
    const validation = validateSubjectConfig(config, config.subject);
    if (!validation.valid) continue;
    const ref: SubjectRef = bySubjectId.get(config.subject)?.ref ?? {
      id: config.subject,
      name: config.name,
      file: '(importováno)',
      icon: '📥',
    };
    bySubjectId.set(config.subject, {
      ref,
      config,
      flatQuestions: flattenQuestions(config.questions),
    });
  }

  for (const subj of bySubjectId.values()) {
    subjects.push(subj);
  }

  const questionIndex = new Map<string, { subjectId: string; question: Question }>();
  for (const subj of subjects) {
    for (const q of subj.flatQuestions) {
      questionIndex.set(q.id, { subjectId: subj.ref.id, question: q });
    }
  }

  return { subjects, invalid, questionIndex };
}
