/**
 * Real-browser checks for the login gate.
 *
 * Requires a dev server built WITH Supabase credentials present (real or
 * placeholder) so `isSyncConfigured` is true — the gate is a no-op otherwise
 * by design.
 *
 *   BASE_URL=http://localhost:5175 node scripts/verify-auth.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5175';

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch();

// --- Signed out: the gate redirects and remembers where you were going -----
{
  const page = await browser.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  check('signed out, "/" redirects to /login', new URL(page.url()).pathname === '/login',
    page.url());
  check('login page offers sign-in', await page.getByText('Sign in').first().isVisible());
  check('login page offers the local escape hatch',
    await page.getByRole('button', { name: /continue without an account/i }).isVisible());

  await page.goto(`${BASE}/mistakes`, { waitUntil: 'networkidle' });
  check('signed out, a deep link redirects to /login',
    new URL(page.url()).pathname === '/login', page.url());
  await page.close();
}

// --- The escape hatch returns you to the deep link you asked for ----------
{
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/mistakes`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /continue without an account/i }).click();
  await page.waitForURL(/\/mistakes$/, { timeout: 5000 }).catch(() => {});
  check('continuing locally returns to the originally requested route',
    new URL(page.url()).pathname === '/mistakes', page.url());

  // And the app actually works from there.
  check('the app shell renders after continuing locally',
    await page.getByRole('link', { name: 'Dashboard' }).isVisible());

  // The choice sticks across a reload — no gate on every load.
  await page.reload({ waitUntil: 'networkidle' });
  check('local-only choice survives a reload',
    new URL(page.url()).pathname === '/mistakes', page.url());

  // Visiting /login while already through should bounce back into the app.
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  check('/login bounces out when already past the gate',
    new URL(page.url()).pathname !== '/login', page.url());

  // Settings should now offer a way to sign in after all.
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  check('Settings still offers sign-in in local mode',
    await page.getByRole('button', { name: /send sign-in link/i }).isVisible());

  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

// --- Ungated routes ------------------------------------------------------
{
  const page = await browser.newPage();
  await page.goto(`${BASE}/formulas/print`, { waitUntil: 'networkidle' });
  check('the print sheet stays reachable without the gate',
    new URL(page.url()).pathname === '/formulas/print', page.url());
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
