import type { Question } from '../../types/config';
import CodeBlock from '../CodeBlock';
import SingleChoice from './SingleChoice';
import MultipleChoice from './MultipleChoice';
import TrueFalse from './TrueFalse';
import Matching from './Matching';
import Ordering from './Ordering';
import Numeric from './Numeric';
import Categorize from './Categorize';
import Gap from './Gap';
import Passage from './Passage';

interface Props {
  question: Question;
  answer: unknown;
  onChange: (answer: unknown) => void;
  revealed: boolean;
}

export default function QuestionRenderer({ question, answer, onChange, revealed }: Props) {
  const body = (() => {
    switch (question.type) {
      case 'single':
        return <SingleChoice question={question} answer={answer as any} onChange={onChange as any} revealed={revealed} />;
      case 'multiple':
        return <MultipleChoice question={question} answer={answer as any} onChange={onChange as any} revealed={revealed} />;
      case 'truefalse':
        return <TrueFalse question={question} answer={answer as any} onChange={onChange as any} revealed={revealed} />;
      case 'matching':
        return <Matching question={question} answer={answer as any} onChange={onChange as any} revealed={revealed} />;
      case 'ordering':
        return <Ordering question={question} answer={answer as any} onChange={onChange as any} revealed={revealed} />;
      case 'numeric':
        return <Numeric question={question} answer={answer as any} onChange={onChange as any} revealed={revealed} />;
      case 'categorize':
        return <Categorize question={question} answer={answer as any} onChange={onChange as any} revealed={revealed} />;
      case 'gap':
        return <Gap question={question} answer={answer as any} onChange={onChange as any} revealed={revealed} />;
      case 'passage':
        return <Passage question={question} answer={answer as any} onChange={onChange as any} revealed={revealed} />;
      default:
        return null;
    }
  })();

  return (
    <div>
      {question.image && (
        <img src={question.image} alt="" className="mb-3 max-h-72 w-auto max-w-full rounded-lg object-contain" />
      )}
      {question.code && <CodeBlock code={question.code} language={question.language} />}
      {body}
    </div>
  );
}
