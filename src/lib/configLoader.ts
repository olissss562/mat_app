import type { GroupManifest, GroupRef, Manifest, Question, SubjectConfig, SubjectRef } from '../types/config';
import { validateSubjectConfig } from './validator';
import { loadImportedConfigs, loadMyConfigs } from './storage';

export interface LoadedSubject {
  ref: SubjectRef;
  group: GroupRef;
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

async function fetchJSON(path: string): Promise<{ data: any } | { error: string }> {
  try {
    const res = await fetch(`${basePath()}configs/${path}`);
    if (!res.ok) {
      return { error: `Soubor "${path}" se nepodařilo načíst (HTTP ${res.status})` };
    }
    const data = await res.json();
    return { data };
  } catch (e) {
    return { error: `Soubor "${path}" se nepodařilo načíst (${(e as Error).message})` };
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

  for (const group of manifest.groups ?? []) {
    const groupManifestResult = await fetchJSON(`${group.dir}/manifest.json`);
    if ('error' in groupManifestResult) {
      invalid.push({ ref: { id: group.id, name: group.name, file: `${group.dir}/manifest.json` }, errors: [groupManifestResult.error] });
      continue;
    }
    const groupManifest = groupManifestResult.data as GroupManifest;
    for (const subjectRef of groupManifest.subjects ?? []) {
      const ref: SubjectRef = { ...subjectRef, file: `${group.dir}/${subjectRef.file}` };
      const result = await fetchJSON(ref.file);
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
        group,
        config,
        flatQuestions: flattenQuestions(config.questions),
      });
    }
  }

  // Merge imported configs from localStorage; imported overrides bundled with same subject id
  const imported = loadImportedConfigs();
  const importedGroup: GroupRef = { id: 'imported', name: 'Importováno', dir: '', icon: '📥' };
  for (const config of imported) {
    const validation = validateSubjectConfig(config, config.subject);
    if (!validation.valid) continue;
    const existing = bySubjectId.get(config.subject);
    const ref: SubjectRef = existing?.ref ?? {
      id: config.subject,
      name: config.name,
      file: '(importováno)',
      icon: '📥',
    };
    bySubjectId.set(config.subject, {
      ref,
      group: existing?.group ?? importedGroup,
      config,
      flatQuestions: flattenQuestions(config.questions),
    });
  }

  // Merge personally-authored configs (built in-app via "Moje otázky"); they get their own
  // group so the user can tell their own creations apart from bundled/imported content.
  const mine = loadMyConfigs();
  const myGroup: GroupRef = { id: 'mine', name: 'Moje otázky', dir: '', icon: '✍️' };
  for (const config of mine) {
    const validation = validateSubjectConfig(config, config.subject);
    if (!validation.valid) continue;
    const ref: SubjectRef = {
      id: config.subject,
      name: config.name,
      file: '(vlastní)',
      icon: '✍️',
    };
    bySubjectId.set(config.subject, {
      ref,
      group: myGroup,
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
