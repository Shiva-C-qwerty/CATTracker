import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';
import { ErrorBoundary } from './ErrorBoundary';
import { QuickAddProvider } from '@/features/mistakes/QuickAddProvider';
import { CommandPalette } from '@/features/command/CommandPalette';
import { downloadBackup } from '@/features/settings/fileTransfer';
import { useExportReminder } from '@/features/settings/useExportReminder';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/mocks', label: 'Mocks' },
  { to: '/sections/QA', label: 'Sections' },
  { to: '/mistakes', label: 'Mistakes' },
  { to: '/revise', label: 'Revise' },
  { to: '/formulas', label: 'Formulas' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
];

export function AppShell() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const reminder = useExportReminder();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setNavOpen(false), [location.pathname]);

  // Global Ctrl/Cmd+E — export a backup from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        void downloadBackup();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <QuickAddProvider>
      <CommandPalette />
      <div className="flex h-full">
        {/* Mobile backdrop */}
        {navOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setNavOpen(false)}
            aria-hidden
          />
        )}

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 transition-transform dark:border-slate-800 dark:bg-slate-900',
            'md:static md:translate-x-0',
            navOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="px-2 pb-4">
            <div className="text-lg font-semibold tracking-tight">CAT Tracker</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">CAT 2026 prep</div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={toggle}
            className="mt-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
          </button>
          <div className="px-3 pt-1 text-xs text-slate-400">⌘/Ctrl+K for commands</div>
        </aside>

        <main className="flex flex-1 flex-col overflow-y-auto">
          {/* Mobile top bar */}
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 md:hidden dark:border-slate-800">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              className="rounded-md p-1 text-xl leading-none hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ☰
            </button>
            <span className="font-semibold">CAT Tracker</span>
          </div>

          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
            {reminder.due && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                <span className="text-amber-800 dark:text-amber-300">
                  {reminder.lastExportAt
                    ? `It's been ${reminder.daysSince} days since your last backup.`
                    : 'You have never backed up your data.'}{' '}
                  Export to keep it safe.
                </span>
                <Link
                  to="/settings"
                  className="shrink-0 rounded-md border border-amber-400 px-2 py-1 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
                >
                  Back up now
                </Link>
              </div>
            )}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </QuickAddProvider>
  );
}
