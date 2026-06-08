import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Domů', icon: '🏠' },
  { to: '/stats', label: 'Statistiky', icon: '📊' },
  { to: '/import', label: 'Import', icon: '📥' },
];

export default function BottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:hidden">
      <div className="flex">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
              location.pathname === item.to
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
