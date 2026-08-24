import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { META_KEYS, getMeta, setMeta } from '@/db/meta';
import { seedDatabase } from '@/db/seed';
import {
  clearAllData,
  countTables,
  importAll,
  parseBackup,
  type BackupFile,
} from '@/db/backup';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Input';
import { downloadBackup, readFileAsText } from './fileTransfer';
import { useExportReminder } from './useExportReminder';
import { SyncPanel } from './SyncPanel';
import { GoalsManager } from '@/features/goals/GoalsManager';

export function SettingsPage() {
  const reminder = useExportReminder();
  const examDate = useLiveQuery(() => getMeta<number>(META_KEYS.examDate), []);
  const fileInput = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<BackupFile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setError(null);
    try {
      await downloadBackup();
      setMessage('Backup downloaded.');
    } catch (err) {
      console.error(err);
      setError('Export failed.');
    }
  }

  async function handleFileChosen(file: File | undefined) {
    setError(null);
    setMessage(null);
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setPending(parseBackup(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that backup.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function runImport(mode: 'merge' | 'replace') {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await importAll(pending, mode);
      // Ensure any brand-new install still has seed defaults after a merge.
      await seedDatabase();
      setMessage(`Import complete (${mode}).`);
      setPending(null);
    } catch (err) {
      console.error(err);
      setError('Import failed — your existing data was not changed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReseed() {
    setBusy(true);
    try {
      await seedDatabase();
      setMessage('Chapters re-seeded (additive).');
    } finally {
      setBusy(false);
    }
  }

  async function handleClearAll() {
    if (!window.confirm('Delete ALL data? This erases every mock, mistake, and note.')) return;
    if (!window.confirm('Are you absolutely sure? This cannot be undone. Export first if unsure.'))
      return;
    setBusy(true);
    try {
      await clearAllData();
      await seedDatabase();
      setMessage('All data cleared and chapters re-seeded.');
    } finally {
      setBusy(false);
    }
  }

  const counts = pending ? countTables(pending.tables) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      {error && (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </p>
      )}

      <Card>
        <h2 className="text-sm font-semibold">Exam date</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Drives the dashboard countdown. Defaults to the last Sunday of November 2026.
        </p>
        <div className="mt-3">
          <Field label="CAT exam date">
            <Input
              type="date"
              className="w-48"
              value={examDate ? format(examDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const t = new Date(`${e.target.value}T09:00:00`).getTime();
                if (!Number.isNaN(t)) void setMeta(META_KEYS.examDate, t);
              }}
            />
          </Field>
        </div>
      </Card>

      <SyncPanel />

      <GoalsManager />

      <Card>
        <h2 className="text-sm font-semibold">Backup &amp; restore</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          All data lives in your browser. Export regularly — it is your only backup.
          {reminder.lastExportAt
            ? ` Last export ${reminder.daysSince === 0 ? 'today' : `${reminder.daysSince} day(s) ago`}.`
            : ' You have never exported.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={handleExport}>Export all data (JSON)</Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            Import from JSON…
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void handleFileChosen(e.target.files?.[0])}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">Shortcut: Ctrl/Cmd + E to export anytime.</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Seed data</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Re-add any built-in chapters missing from your list. Additive — never overwrites your
          edits or custom chapters.
        </p>
        <div className="mt-3">
          <Button variant="secondary" onClick={handleReseed} disabled={busy}>
            Re-seed chapters
          </Button>
        </div>
      </Card>

      <Card className="border-rose-300 dark:border-rose-900">
        <h2 className="text-sm font-semibold text-rose-700 dark:text-rose-400">Danger zone</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Permanently delete all data. Export first if there is any chance you want it back.
        </p>
        <div className="mt-3">
          <Button variant="danger" onClick={handleClearAll} disabled={busy}>
            Clear all data
          </Button>
        </div>
      </Card>

      <Modal open={pending !== null} onClose={() => setPending(null)} title="Import backup">
        {counts && pending && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This backup was exported {format(pending.exportedAt, 'dd MMM yyyy, HH:mm')} and
              contains:
            </p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {Object.entries(counts).map(([table, n]) => (
                <li key={table} className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{table}</span>
                  <span className="tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-md border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <strong>Merge</strong> keeps your current data and updates matching records.{' '}
              <strong>Replace</strong> erases everything first, then loads only this file.
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void runImport('merge')} disabled={busy}>
                {busy ? 'Importing…' : 'Merge'}
              </Button>
              <Button variant="danger" onClick={() => void runImport('replace')} disabled={busy}>
                Replace everything
              </Button>
              <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
