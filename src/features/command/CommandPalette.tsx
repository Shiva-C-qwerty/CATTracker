import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { useQuickAdd } from '@/features/mistakes/QuickAddProvider';
import { downloadBackup } from '@/features/settings/fileTransfer';

interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/** Global command palette. Opens with Ctrl/Cmd+K or "/" (when not typing). */
export function CommandPalette() {
  const navigate = useNavigate();
  const quickAdd = useQuickAdd();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(() => {
    const go = (to: string) => () => {
      setOpen(false);
      navigate(to);
    };
    return [
      { id: 'dash', label: 'Go to Dashboard', run: go('/') },
      { id: 'mocks', label: 'Go to Mocks', run: go('/mocks') },
      { id: 'addmock', label: 'Add mock', hint: 'new', run: go('/mocks/new') },
      { id: 'mistakes', label: 'Go to Mistake Log', run: go('/mistakes') },
      { id: 'revise', label: 'Go to Revision Queue', run: go('/revise') },
      { id: 'formulas', label: 'Go to Formula Bank', run: go('/formulas') },
      { id: 'print', label: 'Print formula sheet', run: go('/formulas/print') },
      { id: 'analytics', label: 'Go to Analytics', run: go('/analytics') },
      { id: 'varc', label: 'Go to VARC chapters', run: go('/sections/VARC') },
      { id: 'dilr', label: 'Go to DILR chapters', run: go('/sections/DILR') },
      { id: 'qa', label: 'Go to QA chapters', run: go('/sections/QA') },
      { id: 'settings', label: 'Go to Settings', run: go('/settings') },
      {
        id: 'logmistake',
        label: 'Log a mistake',
        hint: 'Ctrl+M',
        run: () => {
          setOpen(false);
          quickAdd.open();
        },
      },
      {
        id: 'export',
        label: 'Export backup',
        hint: 'Ctrl+E',
        run: () => {
          setOpen(false);
          void downloadBackup();
        },
      },
    ];
  }, [navigate, quickAdd]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  // Open shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === '/' && !isTypingTarget(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[index]?.run();
    }
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <div onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command… (↑↓ to move, Enter to run)"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900"
        />
        <ul className="mt-2 max-h-80 overflow-y-auto">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">No matching command.</li>
          )}
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => c.run()}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm',
                  i === index ? 'bg-slate-100 dark:bg-slate-800' : '',
                )}
              >
                <span>{c.label}</span>
                {c.hint && <span className="text-xs text-slate-400">{c.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
