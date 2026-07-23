interface PagePlaceholderProps {
  title: string;
  phase: string;
}

/**
 * Temporary stub for routes not yet built. Each references the PROGRESS.md
 * phase that will replace it, so the app is navigable during the build-out.
 */
export function PagePlaceholder({ title, phase }: PagePlaceholderProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Coming up in {phase}. This route is scaffolded but not yet implemented.
      </p>
    </div>
  );
}
