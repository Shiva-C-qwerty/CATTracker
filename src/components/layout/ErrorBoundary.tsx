import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so one broken screen shows a message instead of a
 * blank page. Reset by navigating (key change) or reloading.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Render error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/40">
          <p className="font-semibold text-rose-700 dark:text-rose-300">Something went wrong on this screen.</p>
          <p className="mt-1 text-rose-600 dark:text-rose-400">{this.state.error.message}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-md border border-rose-300 px-3 py-1 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-rose-300 px-3 py-1 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
