import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '@/db/db';
import type { MockType, SectionId } from '@/db/types';
import { addMock, updateMock, type MockSectionInput } from '@/db/mutations';
import { SECTIONS, SECTION_IDS } from '@/lib/sections';
import { MOCK_TYPES, MOCK_TYPE_LABEL } from '@/lib/mockMeta';
import { accuracy, mockTotals, sectionScore } from '@/lib/scoring';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useProviders } from './useProviders';

// Section time is a constant in CAT (40 min each), so we don't ask for it —
// we just record the standard. Keeps entry to two numbers per section.
const SECTION_TIME_MIN = 40;

interface SectionForm {
  attempted: number;
  correct: number;
}

type SectionState = Record<SectionId, SectionForm>;

function emptySections(): SectionState {
  return {
    VARC: { attempted: 0, correct: 0 },
    DILR: { attempted: 0, correct: 0 },
    QA: { attempted: 0, correct: 0 },
  };
}

/** incorrect is always derived: everything attempted but not correct. */
function derive(s: SectionForm) {
  const attempted = Math.max(0, s.attempted);
  const correct = Math.min(Math.max(0, s.correct), attempted);
  const incorrect = attempted - correct;
  return { attempted, correct, incorrect, score: sectionScore(correct, incorrect) };
}

const TYPE_OPTIONS = MOCK_TYPES.map((t) => ({ value: t, label: MOCK_TYPE_LABEL[t] }));

export function MockFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id != null;
  const existing = useLiveQuery(() => (id ? db.mocks.get(id) : undefined), [id]);
  const providers = useProviders();

  const [initialised, setInitialised] = useState(false);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [type, setType] = useState<MockType>('full-mock');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [overallPercentile, setOverallPercentile] = useState('');
  const [primarySection, setPrimarySection] = useState<SectionId>('QA');
  const [sections, setSections] = useState<SectionState>(emptySections);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate the form once when editing an existing mock.
  if (isEdit && existing && !initialised) {
    setInitialised(true);
    setName(existing.name);
    setProvider(existing.provider);
    setType(existing.type);
    setDateStr(format(existing.takenAt, 'yyyy-MM-dd'));
    setOverallPercentile(existing.overallPercentile?.toString() ?? '');
    setNotes(existing.notes);
    const next = emptySections();
    for (const s of existing.sections) {
      next[s.sectionId] = { attempted: s.attempted, correct: s.correct };
    }
    setSections(next);
    if (existing.type !== 'full-mock' && existing.sections[0]) {
      setPrimarySection(existing.sections[0].sectionId);
    }
  }

  const activeSections: SectionId[] = type === 'full-mock' ? SECTION_IDS : [primarySection];

  const totals = useMemo(
    () =>
      mockTotals(
        activeSections.map((sid) => {
          const d = derive(sections[sid]);
          return {
            sectionId: sid,
            attempted: d.attempted,
            correct: d.correct,
            incorrect: d.incorrect,
            timeSpentMin: SECTION_TIME_MIN,
            score: d.score,
            percentile: null,
          };
        }),
      ),
    [activeSections, sections],
  );

  function setSectionField(sid: SectionId, field: keyof SectionForm, value: number) {
    setSections((prev) => ({ ...prev, [sid]: { ...prev[sid], [field]: value } }));
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const takenAt = new Date(`${dateStr}T09:00:00`).getTime();
      if (Number.isNaN(takenAt)) throw new Error('Please pick a valid date.');
      const finalName = name.trim() || defaultName(provider, dateStr);
      const sectionInputs: MockSectionInput[] = activeSections.map((sid) => {
        const d = derive(sections[sid]);
        return {
          sectionId: sid,
          attempted: d.attempted,
          correct: d.correct,
          incorrect: d.incorrect,
          timeSpentMin: SECTION_TIME_MIN,
          percentile: null,
        };
      });
      const payload = {
        name: finalName,
        provider: provider.trim(),
        type,
        takenAt,
        overallPercentile: parseOptionalNumber(overallPercentile),
        notes,
        sections: sectionInputs,
      };
      if (isEdit && id) {
        await updateMock(id, payload);
        navigate(`/mocks/${id}`);
      } else {
        const newMockId = await addMock(payload);
        navigate(`/mocks/${newMockId}`);
      }
    } catch (err) {
      console.error('Saving mock failed:', err);
      setError(err instanceof Error ? err.message : 'Could not save the mock. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">{isEdit ? 'Edit mock' : 'Add mock'}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name" hint="optional">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="SimCAT 07" />
        </Field>
        <Field label="Provider">
          <Input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="IMS"
            list="providers"
          />
          <datalist id="providers">
            {providers.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Type">
          <Select value={type} options={TYPE_OPTIONS} onChange={setType} />
        </Field>
        <Field label="Date">
          <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        </Field>
      </div>

      {type !== 'full-mock' && (
        <Field label="Section">
          <Select
            value={primarySection}
            options={SECTION_IDS.map((s) => ({ value: s, label: SECTIONS[s].short }))}
            onChange={setPrimarySection}
            className="w-40"
          />
        </Field>
      )}

      <SectionGrid activeSections={activeSections} sections={sections} onChange={setSectionField} />

      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
        <Stat label="Total score" value={totals.score} />
        <Stat label="Attempted" value={totals.attempted} />
        <Stat label="Correct" value={totals.correct} />
        <Stat label="Incorrect" value={totals.incorrect} />
        <Stat label="Accuracy" value={`${(totals.accuracy * 100).toFixed(1)}%`} />
        <div className="ml-auto">
          <Field label="Overall %ile" hint="optional">
            <Input
              type="number"
              className="w-28"
              value={overallPercentile}
              onChange={(e) => setOverallPercentile(e.target.value)}
              placeholder="—"
            />
          </Field>
        </div>
      </div>

      <Field label="Post-mortem notes" hint="optional">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="What went well / what cost me marks / one change for next mock"
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </Field>

      {error && (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save mock'}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/mocks')} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function SectionGrid({
  activeSections,
  sections,
  onChange,
}: {
  activeSections: SectionId[];
  sections: SectionState;
  onChange: (sid: SectionId, field: keyof SectionForm, value: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="w-28">Section</th>
            <th>Attempted</th>
            <th>Correct</th>
            <th className="text-right">Wrong</th>
            <th className="text-right">Score</th>
            <th className="text-right">Acc</th>
          </tr>
        </thead>
        <tbody>
          {activeSections.map((sid) => {
            const d = derive(sections[sid]);
            const acc = accuracy(d.correct, d.attempted);
            return (
              <tr key={sid}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', SECTIONS[sid].dot)} />
                    <span className="font-medium">{SECTIONS[sid].short}</span>
                  </div>
                </td>
                <td>
                  <NumberCell
                    value={sections[sid].attempted}
                    onChange={(v) => onChange(sid, 'attempted', v)}
                  />
                </td>
                <td>
                  <NumberCell
                    value={sections[sid].correct}
                    max={sections[sid].attempted}
                    onChange={(v) => onChange(sid, 'correct', v)}
                  />
                </td>
                <td className="text-right tabular-nums text-slate-500 dark:text-slate-400">
                  {d.incorrect}
                </td>
                <td className="text-right font-semibold tabular-nums">{d.score}</td>
                <td className="text-right tabular-nums text-slate-500 dark:text-slate-400">
                  {(acc * 100).toFixed(0)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-slate-400">
        Wrong, score and accuracy are computed for you. Section time is taken as the standard{' '}
        {SECTION_TIME_MIN} min.
      </p>
    </div>
  );
}

function NumberCell({
  value,
  max,
  onChange,
}: {
  value: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <Input
      type="number"
      min={0}
      max={max}
      inputMode="numeric"
      className="w-20 tabular-nums"
      value={value === 0 ? '' : value}
      placeholder="0"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => onChange(clampInt(e.target.value))}
    />
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function clampInt(raw: string): number {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseOptionalNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function defaultName(provider: string, dateStr: string): string {
  const p = provider.trim();
  return p ? `${p} — ${dateStr}` : `Mock — ${dateStr}`;
}
