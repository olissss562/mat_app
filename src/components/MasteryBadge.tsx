interface Props {
  mastery: number;
  size?: 'sm' | 'md';
}

function colorFor(mastery: number): string {
  if (mastery < 40) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (mastery < 70) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  if (mastery < 90) return 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300';
  return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
}

export default function MasteryBadge({ mastery, size = 'md' }: Props) {
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${colorFor(mastery)}`}>
      {mastery}%
    </span>
  );
}
