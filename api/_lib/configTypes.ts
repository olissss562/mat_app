// Local copy of src/types/config.ts — kept self-contained inside /api so the serverless
// function bundler never has to trace/resolve files outside this directory (cross-directory
// imports from /api into /src have been observed to crash functions at load time on Vercel
// with a generic FUNCTION_INVOCATION_FAILED, since the bundle only includes /api by default).
// Keep this in sync with src/types/config.ts if the question schema changes.

export interface SubjectConfig {
  subject: string;
  name: string;
  topics: Topic[];
  questions: Question[];
}
export interface Topic {
  id: string;
  name: string;
}

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
  id: string;
  type: QuestionType;
  topic: string;
  difficulty?: 1 | 2 | 3;
  tags?: string[];
  explanation?: string;
  source?: string;
  code?: string;
  language?: string;
  image?: string;
}

export interface SingleQuestion extends QuestionBase {
  type: 'single';
  question: string;
  options: { text: string; correct: boolean }[];
}
export interface MultipleQuestion extends QuestionBase {
  type: 'multiple';
  question: string;
  options: { text: string; correct: boolean }[];
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
  items: string[];
}
export interface NumericQuestion extends QuestionBase {
  type: 'numeric';
  question: string;
  answer: number;
  tolerance?: number;
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
  text: string;
  blanks: { accept: string[] }[];
}
export interface PassageQuestion extends QuestionBase {
  type: 'passage';
  passage: string;
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
