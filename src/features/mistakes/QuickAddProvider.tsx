import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { QuickAddMistake, type QuickAddDefaults } from './QuickAddMistake';

interface QuickAddContextValue {
  open: (defaults?: QuickAddDefaults) => void;
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

/** Access the global mistake quick-add. Available anywhere under the provider. */
export function useQuickAdd(): QuickAddContextValue {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error('useQuickAdd must be used within QuickAddProvider');
  return ctx;
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaults, setDefaults] = useState<QuickAddDefaults | undefined>();

  const open = useCallback((d?: QuickAddDefaults) => {
    setDefaults(d);
    setIsOpen(true);
  }, []);

  // Global shortcut: Ctrl/Cmd + M opens the quick-add from any screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setDefaults(undefined);
        setIsOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <QuickAddContext.Provider value={{ open }}>
      {children}

      <button
        type="button"
        onClick={() => open()}
        title="Log a mistake (Ctrl/Cmd+M)"
        aria-label="Log a mistake"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-slate-900 text-2xl text-white shadow-lg transition-transform hover:scale-105 dark:bg-white dark:text-slate-900"
      >
        +
      </button>

      <QuickAddMistake open={isOpen} onClose={() => setIsOpen(false)} defaults={defaults} />
    </QuickAddContext.Provider>
  );
}
