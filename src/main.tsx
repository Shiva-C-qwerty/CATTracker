import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { seedDatabase } from '@/db/seed';
import { installChangeTracking } from '@/db/changeTracking';
import 'katex/dist/katex.min.css';
import './index.css';

// Must run before any write, including the seed below — records written
// without a `_updatedAt` stamp are invisible to the sync push query.
installChangeTracking();

// Ask the browser to keep our IndexedDB data (don't evict under storage
// pressure). Best-effort — ignored where unsupported. This is the user's only
// local copy of months of prep data, so it's worth requesting.
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

// Seed once before first render so every screen can assume chapters exist.
// IndexedDB seeding is fast and idempotent; blocking here avoids empty-state
// flicker on first paint.
seedDatabase()
  .catch((err) => console.error('Seeding failed:', err))
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  });
