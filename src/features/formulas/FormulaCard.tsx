import type { Formula } from '@/db/types';
import { deleteFormula, toggleFormulaStar } from '@/db/mutations';
import { FormulaMath } from '@/components/ui/FormulaMath';

export function FormulaCard({
  formula,
  onEdit,
}: {
  formula: Formula;
  onEdit: (f: Formula) => void;
}) {
  async function handleDelete() {
    const msg = formula.isSeeded
      ? 'Delete this built-in formula? Re-seeding from Settings will restore it.'
      : 'Delete this formula? This cannot be undone.';
    if (window.confirm(msg)) await deleteFormula(formula.id);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">{formula.title}</h3>
        <button
          type="button"
          onClick={() => void toggleFormulaStar(formula.id, !formula.isStarred)}
          aria-label={formula.isStarred ? 'Unstar' : 'Star'}
          title={formula.isStarred ? 'Starred — in your print sheet' : 'Star for the print sheet'}
          className={formula.isStarred ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'}
        >
          {formula.isStarred ? '★' : '☆'}
        </button>
      </div>

      <div className="overflow-x-auto py-1">
        <FormulaMath latex={formula.latex} fallback={formula.plainText} />
      </div>

      {formula.whenToUse && (
        <p className="text-sm">
          <span className="text-xs uppercase text-slate-400">When: </span>
          {formula.whenToUse}
        </p>
      )}
      {formula.commonTrap && (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          <span className="text-xs uppercase text-rose-400">Trap: </span>
          {formula.commonTrap}
        </p>
      )}
      {formula.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{formula.description}</p>
      )}

      <div className="mt-1 flex gap-3 text-xs">
        <button type="button" onClick={() => onEdit(formula)} className="text-slate-500 hover:underline">
          Edit
        </button>
        <button type="button" onClick={handleDelete} className="text-rose-500 hover:underline">
          Delete
        </button>
        {formula.isSeeded && <span className="ml-auto text-slate-300 dark:text-slate-600">built-in</span>}
      </div>
    </div>
  );
}
