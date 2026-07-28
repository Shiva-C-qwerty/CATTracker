import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Chapter, Formula } from '@/db/types';
import { SECTIONS } from '@/lib/sections';
import { FormulaMath } from '@/components/ui/FormulaMath';

/**
 * Print-optimised sheet of starred formulas. Rendered OUTSIDE the app shell so
 * it prints clean. Dense two-column layout via a print stylesheet.
 */
export function FormulaPrintPage() {
  const formulas = useLiveQuery(() => db.formulas.filter((f) => f.isStarred).toArray(), []);
  const chapters = useLiveQuery(() => db.chapters.toArray(), []);
  const chapterMap = useMemo(() => new Map((chapters ?? []).map((c) => [c.id, c])), [chapters]);

  const groups = useMemo(() => groupByChapter(formulas ?? [], chapterMap), [formulas, chapterMap]);

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-slate-900 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to="/formulas" className="text-sm text-slate-500 hover:underline">
          ← Back to Formula Bank
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Print / Save as PDF
        </button>
      </div>

      <h1 className="mb-1 text-xl font-bold">CAT Formula Sheet</h1>
      <p className="mb-4 text-xs text-slate-500">
        {formulas?.length ?? 0} starred formulas · generated {new Date().toLocaleDateString()}
      </p>

      {formulas && formulas.length === 0 ? (
        <p className="text-sm text-slate-500 print:hidden">
          No starred formulas yet. Star formulas in the Formula Bank to build your revision sheet.
        </p>
      ) : (
        <div className="columns-1 gap-6 sm:columns-2">
          {groups.map((g) => (
            <section key={g.chapter.id} className="mb-4 break-inside-avoid">
              <h2 className="mb-1 border-b border-slate-300 text-xs font-bold uppercase tracking-wide">
                {SECTIONS[g.chapter.sectionId].short} · {g.chapter.name}
              </h2>
              <ul className="flex flex-col gap-2">
                {g.formulas.map((f) => (
                  <li key={f.id} className="break-inside-avoid text-sm">
                    <div className="font-medium">{f.title}</div>
                    <div className="my-0.5 text-[0.95em]">
                      <FormulaMath latex={f.latex} fallback={f.plainText} />
                    </div>
                    {f.whenToUse && <div className="text-xs text-slate-600">When: {f.whenToUse}</div>}
                    {f.commonTrap && <div className="text-xs text-slate-600">Trap: {f.commonTrap}</div>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

interface Group {
  chapter: Chapter;
  formulas: Formula[];
}

function groupByChapter(formulas: Formula[], chapterMap: Map<string, Chapter>): Group[] {
  const byChapter = new Map<string, Formula[]>();
  for (const f of formulas) {
    const list = byChapter.get(f.chapterId) ?? [];
    list.push(f);
    byChapter.set(f.chapterId, list);
  }
  return [...byChapter.entries()]
    .map(([id, list]) => ({ chapter: chapterMap.get(id), formulas: list }))
    .filter((g): g is Group => g.chapter !== undefined)
    .sort((a, b) => a.chapter.orderIndex - b.chapter.orderIndex);
}
