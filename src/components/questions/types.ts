export interface QuestionComponentProps<TQuestion, TAnswer> {
  question: TQuestion;
  answer: TAnswer;
  onChange: (answer: TAnswer) => void;
  revealed: boolean;
}
