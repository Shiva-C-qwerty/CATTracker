import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from './App';

describe('App smoke', () => {
  it('renders the shell without crashing', async () => {
    // Polyfill matchMedia (jsdom lacks it) — the theme code may touch it.
    if (!window.matchMedia) {
      window.matchMedia = () =>
        ({ matches: false, addEventListener() {}, removeEventListener() {} }) as never;
    }
    const { container } = render(<App />);
    await waitFor(() => {
      expect(container.querySelector('aside')).not.toBeNull();
    });
  });
});
