import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';

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

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 dark:border-slate-800 dark:bg-slate-900">
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
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
