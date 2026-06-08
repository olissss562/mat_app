interface Props {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language }: Props) {
  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      {language && (
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          {language}
        </div>
      )}
      <pre className="overflow-x-auto bg-gray-50 p-3 text-sm dark:bg-gray-800">
        <code>{code}</code>
      </pre>
    </div>
  );
}
