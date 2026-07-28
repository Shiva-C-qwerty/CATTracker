import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import type { SectionId, StudyActivity } from '@/db/types';
import { addStudySession } from '@/db/mutations';
import { SECTIONS, SECTION_IDS } from '@/lib/sections';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ChapterSelect } from '@/features/mistakes/ChapterSelect';
import { useAllChapters } from '@/features/mistakes/hooks';

const ACTIVITIES: StudyActivity[] = ['learning', 'practice', 'revision', 'mock-analysis'];

export function StudyLogModal({
  open,
  onClose,
  defaultChapterId,
}: {
  open: boolean;
  onClose: () => void;
  defaultChapterId?: string;
}) {
  const chapters = useAllChapters();

  const [chapterId, setChapterId] = useState('');
  const [sectionId, setSectionId] = useState<SectionId | ''>('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [durationMin, setDurationMin] = useState(30);
  const [activity, setActivity] = useState<StudyActivity>('practice');
  const [attempted, setAttempted] = useState('');
  const [correct, setCorrect] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setChapterId(defaultChapterId ?? '');
    setSectionId('');
    setDateStr(format(new Date(), 'yyyy-MM-dd'));
    setDurationMin(30);
    setActivity('practice');
    setAttempted('');
    setCorrect('');
    setNotes('');
    setError(null);
  }, [open, defaultChapterId]);

  // Derive section from chapter when one is picked.
  const effectiveSection: SectionId | null =
    (chapters?.find((c) => c.id === chapterId)?.sectionId ?? (sectionId || null)) as SectionId | null;

  async function save() {
    setError(null);
    if (durationMin <= 0) return setError('Enter how many minutes you studied.');
    setSaving(true);
    try {
      await addStudySession({
        chapterId: chapterId || null,
        sectionId: effectiveSection,
        startedAt: new Date(`${dateStr}T18:00:00`).getTime(),
        durationMin,
        questionsAttempted: attempted ? Number(attempted) : null,
        questionsCorrect: correct ? Number(correct) : null,
        activity,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Could not save the session.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log study session">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Chapter" hint="optional">
            {chapters && (
              <ChapterSelect
                chapters={chapters}
                value={chapterId}
                onChange={setChapterId}
                allowEmpty
                emptyLabel="No specific chapter"
                className="w-full"
              />
            )}
          </Field>
          <Field label="Section" hint={chapterId ? 'from chapter' : 'optional'}>
            <Select
              value={sectionId}
              onChange={setSectionId}
              disabled={!!chapterId}
              options={[
                { value: '', label: '—' },
                ...SECTION_IDS.map((s) => ({ value: s, label: SECTIONS[s].short })),
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Date">
            <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
          </Field>
          <Field label="Minutes">
            <Input
              type="number"
              min={0}
              value={durationMin === 0 ? '' : durationMin}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setDurationMin(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </Field>
          <Field label="Activity">
            <Select
              value={activity}
              onChange={setActivity}
              options={ACTIVITIES.map((a) => ({ value: a, label: a.replace('-', ' ') }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Questions attempted" hint="optional">
            <Input type="number" min={0} value={attempted} onChange={(e) => setAttempted(e.target.value)} />
          </Field>
          <Field label="Correct" hint="optional">
            <Input type="number" min={0} value={correct} onChange={(e) => setCorrect(e.target.value)} />
          </Field>
        </div>

        <Field label="Notes" hint="optional">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you covered" />
        </Field>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Log session'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
