/* Ek Awaaz — one process serves the site and the API.

   URLs are clean and human: /, /report, /my-cases, /near-you. No .html anywhere.
   Old .html paths 301 to the clean ones so nothing that was linked before breaks. */

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './api.js';
import { aiAvailable } from './ai.js';
import { storageMode } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

/* ---------- API ---------- */

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', api);

/* ---------- pages ----------
   One place that maps a URL to a file. Add a page here and it gets a clean URL. */

const PAGES = {
  '/': 'index.html',
  '/report': 'report.html',
  '/my-cases': 'my-cases.html',
  '/near-you': 'my-cases.html' /* the public wall lives on the same page for now */
};

/* Anything that still asks for a .html file gets moved to its clean URL, permanently. */
const LEGACY = {
  '/index.html': '/',
  '/lodging.html': '/report',
  '/report.html': '/report',
  '/dashboard.html': '/my-cases',
  '/my-cases.html': '/my-cases'
};

app.get(Object.keys(LEGACY), (req, res) => res.redirect(301, LEGACY[req.path] + (req._parsedUrl.hash || '')));

for (const [url, file] of Object.entries(PAGES)) {
  app.get(url, (_req, res) => res.sendFile(path.join(PUBLIC, file)));
}

/* ---------- static assets ----------
   Only public/ is ever served, so working files cannot leak by URL. `index: false`
   and no `extensions` fallback, so /foo.html is never quietly served behind a clean URL. */

app.use(express.static(PUBLIC, {
  index: false,
  redirect: false,
  setHeaders(res, filePath) {
    if (/\.(css|js|woff2?|png|jpe?g|svg)$/.test(filePath)) {
      res.set('Cache-Control', 'public, max-age=3600');
    }
  }
}));

/* ---------- fallbacks ---------- */

app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'No such endpoint.' });
  res.status(404).sendFile(path.join(PUBLIC, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Something broke on our side. Nothing was sent.' });
});

/* Vercel imports the app; a persistent host listens. */
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const base = `http://localhost:${PORT}`;
    console.log('');
    console.log(`  Ek Awaaz    ${base}`);
    console.log(`  Report      ${base}/report`);
    console.log(`  My cases    ${base}/my-cases`);
    console.log(`  Health      ${base}/api/health`);
    console.log(`  Model       ${aiAvailable() ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') + ' (live)' : 'NO API KEY — deterministic fallback active'}`);
    console.log(`  Storage     ${storageMode}`);
    console.log(`  Mock OTP    ${process.env.MOCK_OTP || '123456'}`);
    console.log('');
  });
}

export default app;
