// ---------- Manifest ----------
export interface Manifest {
  title: string;
  version: number;
  subjects: SubjectRef[];
}
export interface SubjectRef {
  id: string;
  name: string;
  file: string; // path relative to /configs/
  icon?: string; // emoji
}

// ---------- Subject file ----------
export interface SubjectConfig {
  subject: string; // must match SubjectRef.id
  name: string;
  topics: Topic[];
  questions: Question[];
}
export interface Topic {
  id: string;
  name: string;
}

// ---------- Question base ----------
export type QuestionType =
  | 'single'
  | 'multiple'
  | 'truefalse'
  | 'matching'
  | 'ordering'
  | 'numeric'
  | 'categorize'
  | 'gap'
  | 'passage';

export interface QuestionBase {
  id: string; // globally unique, e.g. "farma-001"
  type: QuestionType;
  topic: string; // must match a Topic.id in the same subject
  difficulty?: 1 | 2 | 3; // default 1
  tags?: string[];
  explanation?: string; // shown after answering
  source?: string;
  code?: string; // optional code snippet shown above the prompt
  language?: string; // syntax label for the code block, e.g. "python"
  image?: string; // optional image URL/path shown above the prompt
}

// ---------- Per-type ----------
export interface SingleQuestion extends QuestionBase {
  type: 'single';
  question: string;
  options: { text: string; correct: boolean }[]; // exactly one correct
}
export interface MultipleQuestion extends QuestionBase {
  type: 'multiple';
  question: string;
  options: { text: string; correct: boolean }[]; // 1+ correct
}
export interface TrueFalseQuestion extends QuestionBase {
  type: 'truefalse';
  statement: string;
  answer: boolean;
}
export interface MatchingQuestion extends QuestionBase {
  type: 'matching';
  question: string;
  pairs: { left: string; right: string }[];
}
export interface OrderingQuestion extends QuestionBase {
  type: 'ordering';
  question: string;
  items: string[]; // stored in CORRECT order
}
export interface NumericQuestion extends QuestionBase {
  type: 'numeric';
  question: string;
  answer: number;
  tolerance?: number; // default 0
  unit?: string | null;
}
export interface CategorizeQuestion extends QuestionBase {
  type: 'categorize';
  question: string;
  categories: string[];
  items: { text: string; category: string }[];
}
export interface GapQuestion extends QuestionBase {
  type: 'gap';
  text: string; // contains {{0}}, {{1}}, ... placeholders
  blanks: { accept: string[] }[]; // accept[] = case-insensitive accepted answers
}
export interface PassageQuestion extends QuestionBase {
  type: 'passage';
  passage: string;
  // sub-questions reuse the other types but WITHOUT their own id/topic;
  // they inherit topic from the parent and get ids like "<parentId>-sub-0"
  questions: SubQuestion[];
}
export type SubQuestion =
  | Omit<SingleQuestion, 'id' | 'topic'>
  | Omit<MultipleQuestion, 'id' | 'topic'>
  | Omit<TrueFalseQuestion, 'id' | 'topic'>
  | Omit<MatchingQuestion, 'id' | 'topic'>
  | Omit<OrderingQuestion, 'id' | 'topic'>
  | Omit<NumericQuestion, 'id' | 'topic'>
  | Omit<CategorizeQuestion, 'id' | 'topic'>
  | Omit<GapQuestion, 'id' | 'topic'>;

export type Question =
  | SingleQuestion
  | MultipleQuestion
  | TrueFalseQuestion
  | MatchingQuestion
  | OrderingQuestion
  | NumericQuestion
  | CategorizeQuestion
  | GapQuestion
  | PassageQuestion;
