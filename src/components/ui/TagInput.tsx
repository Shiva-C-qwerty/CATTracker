import { useState, type KeyboardEvent } from 'react';
import { Input } from './Input';

/** Freeform chip input. Enter or comma commits a tag; Backspace on an empty
 * field removes the last. Optional `suggestions` drive a datalist. */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add tag…',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label={`Remove ${tag}`}
          >
            ✕
          </button>
        </span>
      ))}
      <Input
        list="tag-suggestions"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder={placeholder}
        className="min-w-[8rem] flex-1 border-0 bg-transparent p-0.5 focus:ring-0 dark:bg-transparent"
      />
      <datalist id="tag-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
