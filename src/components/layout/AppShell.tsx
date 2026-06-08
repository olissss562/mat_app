import type { ReactNode } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
