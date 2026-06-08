interface Props {
  isCorrect: boolean;
  explanation?: string;
  source?: string;
  correctAnswerText?: string;
}

export default function Feedback({ isCorrect, explanation, source, correctAnswerText }: Props) {
  return (
    <div
      className={`mt-4 rounded-lg border p-4 ${
        isCorrect
          ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30'
          : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30'
      }`}
      role="status"
    >
      <p className={`font-semibold ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
        {isCorrect ? 'Správně!' : 'Špatně'}
      </p>
      {!isCorrect && correctAnswerText && (
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium">Správná odpověď: </span>
          {correctAnswerText}
        </p>
      )}
      {explanation && (
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium">Vysvětlení: </span>
          {explanation}
        </div>
      )}
      {source && <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">Zdroj: {source}</p>}
    </div>
  );
}
