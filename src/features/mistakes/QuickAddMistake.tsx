import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import type { Difficulty, ErrorType, MistakeSourceType } from '@/db/types';
import { addMistake, type MistakeInput } from '@/db/mutations';
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  ERROR_TYPES,
  ERROR_TYPE_HINT,
  ERROR_TYPE_LABEL,
} from '@/lib/errorTypes';
import { compressImageToDataUrl, imageFromClipboard } from '@/lib/image';
import { cn } from '@/lib/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TagInput } from '@/components/ui/TagInput';
import { ChapterSelect } from './ChapterSelect';
import { useAllChapters, useAllTags } from './hooks';

export interface QuickAddDefaults {
  chapterId?: string;
  sourceType?: MistakeSourceType;
  sourceId?: string | null;
  sourceLabel?: string;
}

export function QuickAddMistake({
  open,
  onClose,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  defaults?: QuickAddDefaults;
}) {
  const chapters = useAllChapters();
  const tagSuggestions = useAllTags();

  const [chapterId, setChapterId] = useState('');
  const [errorType, setErrorType] = useState<ErrorType | ''>('');
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState<string | null>(null);
  const [keyTakeaway, setKeyTakeaway] = useState('');

  const [showDetail, setShowDetail] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceType, setSourceType] = useState<MistakeSourceType>('practice');
  const [myApproach, setMyApproach] = useState('');
  const [correctApproach, setCorrectApproach] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [tags, setTags] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const takeawayRef = useRef<HTMLInputElement>(null);

  // Reset whenever the modal (re)opens, applying any contextual defaults.
  useEffect(() => {
    if (!open) return;
    setChapterId(defaults?.chapterId ?? '');
    setErrorType('');
    setQuestionText('');
    setQuestionImage(null);
    setKeyTakeaway('');
    setShowDetail(false);
    setSourceLabel(defaults?.sourceLabel ?? '');
    setSourceType(defaults?.sourceType ?? 'practice');
    setMyApproach('');
    setCorrectApproach('');
    setDifficulty('medium');
    setTags([]);
    setError(null);
    setFlash(null);
  }, [open, defaults]);

  async function handlePaste(e: ClipboardEvent) {
    const blob = imageFromClipboard(e.clipboardData.items);
    if (!blob) return;
    e.preventDefault();
    try {
      setQuestionImage(await compressImageToDataUrl(blob));
    } catch (err) {
      console.error('Image paste failed:', err);
      setError('Could not read the pasted image.');
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      setQuestionImage(await compressImageToDataUrl(file));
    } catch (err) {
      console.error('Image read failed:', err);
      setError('Could not read that image.');
    }
  }

  async function save(addAnother: boolean) {
    setError(null);
    if (!chapterId) {
      setError('Pick a chapter.');
      return;
    }
    if (!errorType) {
      setError('Pick an error type.');
      return;
    }
    setSaving(true);
    try {
      const input: MistakeInput = {
        chapterId,
        errorType,
        keyTakeaway: keyTakeaway.trim(),
        questionText: questionText.trim(),
        questionImage,
        myApproach: myApproach.trim(),
        correctApproach: correctApproach.trim(),
        sourceType,
        sourceId: defaults?.sourceId ?? null,
        sourceLabel: sourceLabel.trim(),
        difficulty,
        tags,
      };
      await addMistake(input);
      if (addAnother) {
        // Keep chapter + source context, clear the per-question fields.
        setErrorType('');
        setQuestionText('');
        setQuestionImage(null);
        setKeyTakeaway('');
        setMyApproach('');
        setCorrectApproach('');
        setTags([]);
        setFlash('Saved. Add the next one.');
        takeawayRef.current?.blur();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Saving mistake failed:', err);
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void save(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a mistake">
      <div className="flex flex-col gap-4" onPaste={handlePaste} onKeyDown={onKeyDown}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Chapter">
            {chapters ? (
              <ChapterSelect
                chapters={chapters}
                value={chapterId}
                onChange={setChapterId}
                allowEmpty
                emptyLabel="Select chapter…"
                className="w-full"
              />
            ) : (
              <div className="text-sm text-slate-400">Loading chapters…</div>
            )}
          </Field>
          <Field label="Source" hint="optional">
            <Input
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="SimCAT 07 Q14"
            />
          </Field>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            Error type
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {ERROR_TYPES.map((et) => (
              <button
                key={et}
                type="button"
                title={ERROR_TYPE_HINT[et]}
                onClick={() => setErrorType(et)}
                className={cn(
                  'rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                  errorType === et
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
                )}
              >
                {ERROR_TYPE_LABEL[et]}
              </button>
            ))}
          </div>
        </div>

        <Field label="Question" hint="type, or paste an image (Ctrl/Cmd+V)">
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={2}
            placeholder="Paste the question or a screenshot…"
            className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </Field>

        {questionImage ? (
          <div className="relative w-fit">
            <img
              src={questionImage}
              alt="Pasted question"
              className="max-h-48 rounded-md border border-slate-200 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => setQuestionImage(null)}
              className="absolute -right-2 -top-2 rounded-full bg-slate-900 px-1.5 text-xs text-white dark:bg-white dark:text-slate-900"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="w-fit cursor-pointer text-xs text-slate-500 underline hover:text-slate-800 dark:hover:text-slate-200">
            or attach an image file
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </label>
        )}

        <Field label="Key takeaway" hint="one line — what will stop this next time">
          <Input
            ref={takeawayRef}
            value={keyTakeaway}
            onChange={(e) => setKeyTakeaway(e.target.value)}
            placeholder="e.g. Check units before ratio steps"
          />
        </Field>

        <button
          type="button"
          onClick={() => setShowDetail((s) => !s)}
          className="w-fit text-xs font-medium text-slate-500 underline hover:text-slate-800 dark:hover:text-slate-200"
        >
          {showDetail ? 'Hide detail' : 'Add detail (optional)'}
        </button>

        {showDetail && (
          <div className="flex flex-col gap-4 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Difficulty">
                <Select
                  value={difficulty}
                  onChange={setDifficulty}
                  options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
                />
              </Field>
              <Field label="Source type">
                <Select
                  value={sourceType}
                  onChange={setSourceType}
                  options={(['mock', 'sectional', 'practice', 'module', 'other'] as const).map(
                    (s) => ({ value: s, label: s }),
                  )}
                />
              </Field>
            </div>
            <Field label="My approach">
              <textarea
                value={myApproach}
                onChange={(e) => setMyApproach(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
            <Field label="Correct approach">
              <textarea
                value={correctApproach}
                onChange={(e) => setCorrectApproach(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
            <Field label="Tags">
              <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
            </Field>
          </div>
        )}

        {error && (
          <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        )}
        {flash && !error && <p className="text-sm text-emerald-600 dark:text-emerald-400">{flash}</p>}

        <div className="flex items-center gap-2">
          <Button onClick={() => void save(false)} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="secondary" onClick={() => void save(true)} disabled={saving}>
            Save & add another
          </Button>
          <span className="ml-auto text-xs text-slate-400">⌘/Ctrl + Enter to save</span>
        </div>
      </div>
    </Modal>
  );
}
