import { useEffect, useState } from 'react';
import type { Chapter, Formula } from '@/db/types';
import { addFormula, updateFormula } from '@/db/mutations';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { FormulaMath } from '@/components/ui/FormulaMath';
import { ChapterSelect } from '@/features/mistakes/ChapterSelect';

export function FormulaEditor({
  open,
  onClose,
  chapters,
  editing,
  defaultChapterId,
}: {
  open: boolean;
  onClose: () => void;
  chapters: Chapter[];
  editing?: Formula;
  defaultChapterId?: string;
}) {
  const [chapterId, setChapterId] = useState('');
  const [title, setTitle] = useState('');
  const [latex, setLatex] = useState('');
  const [plainText, setPlainText] = useState('');
  const [description, setDescription] = useState('');
  const [whenToUse, setWhenToUse] = useState('');
  const [commonTrap, setCommonTrap] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChapterId(editing?.chapterId ?? defaultChapterId ?? '');
    setTitle(editing?.title ?? '');
    setLatex(editing?.latex ?? '');
    setPlainText(editing?.plainText ?? '');
    setDescription(editing?.description ?? '');
    setWhenToUse(editing?.whenToUse ?? '');
    setCommonTrap(editing?.commonTrap ?? '');
    setError(null);
  }, [open, editing, defaultChapterId]);

  async function save() {
    setError(null);
    if (!chapterId) return setError('Pick a chapter.');
    if (!title.trim()) return setError('Give the formula a title.');
    setSaving(true);
    try {
      const payload = {
        chapterId,
        title: title.trim(),
        latex: latex.trim(),
        plainText: plainText.trim(),
        description: description.trim(),
        whenToUse: whenToUse.trim(),
        commonTrap: commonTrap.trim(),
      };
      if (editing) await updateFormula(editing.id, payload);
      else await addFormula(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Could not save the formula.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit formula' : 'Add formula'}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Chapter">
            <ChapterSelect
              chapters={chapters}
              value={chapterId}
              onChange={setChapterId}
              allowEmpty
              emptyLabel="Select chapter…"
              className="w-full"
            />
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quadratic roots" />
          </Field>
        </div>

        <Field label="LaTeX" hint="rendered live below">
          <textarea
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            rows={2}
            placeholder="x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
            className="w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </Field>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <FormulaMath latex={latex} fallback={plainText} />
        </div>

        <Field label="Plain text" hint="searchable fallback">
          <Input value={plainText} onChange={(e) => setPlainText(e.target.value)} placeholder="x = (-b ± sqrt(b^2-4ac))/2a" />
        </Field>
        <Field label="When to use" hint="the useful part">
          <Input value={whenToUse} onChange={(e) => setWhenToUse(e.target.value)} />
        </Field>
        <Field label="Common trap">
          <Input value={commonTrap} onChange={(e) => setCommonTrap(e.target.value)} />
        </Field>
        <Field label="Description" hint="optional">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add formula'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
