interface Props {
  value: number; // 0..100
  className?: string;
  colorClassName?: string;
}

export default function ProgressBar({ value, className = '', colorClassName = 'bg-violet-500' }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${colorClassName}`}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
