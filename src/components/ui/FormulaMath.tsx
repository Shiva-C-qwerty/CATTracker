// react-katex is a CommonJS module with `__esModule` set, so different bundlers
// expose its components either as named exports or under `.default`. A plain
// named or default import breaks in one path or the other (and blanks the app).
// Import the whole namespace and read whichever shape is present.
import * as reactKatexNs from 'react-katex';

type KatexComp = (props: { math: string; renderError?: () => JSX.Element }) => JSX.Element;
const katex = ((reactKatexNs as Record<string, unknown>).default ?? reactKatexNs) as {
  BlockMath: KatexComp;
  InlineMath: KatexComp;
};
const { BlockMath, InlineMath } = katex;

/**
 * Render LaTeX with KaTeX. `renderError` guarantees a malformed formula shows
 * a readable fallback instead of throwing and blanking the screen.
 */
export function FormulaMath({
  latex,
  fallback,
  inline = false,
}: {
  latex: string;
  fallback?: string;
  inline?: boolean;
}) {
  const renderError = () => (
    <span className="text-sm text-rose-500" title="Invalid LaTeX">
      {fallback || latex}
    </span>
  );

  if (!latex.trim()) {
    return <span className="text-sm text-slate-400">{fallback || 'No formula'}</span>;
  }

  return inline ? (
    <InlineMath math={latex} renderError={renderError} />
  ) : (
    <BlockMath math={latex} renderError={renderError} />
  );
}
