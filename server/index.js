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
  '/near-you': 'near-you.html'
};

/* Anything that still asks for a .html file gets moved to its clean URL, permanently. */
const LEGACY = {
  '/index.html': '/',
  '/lodging.html': '/report',
  '/report.html': '/report',
  '/dashboard.html': '/my-cases',
  '/my-cases.html': '/my-cases',
  '/near-you.html': '/near-you'
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
      res.set('Cache-Control', process.env.NODE_ENV === 'production' ? 'public, max-age=3600' : 'no-cache');
    }
  }
}));

/* ---------- fallbacks ---------- */

app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'No such endpoint.' });

  /* A missing asset must stay a real 404. Serving the app shell for a .jpg or .css means the
     browser receives HTML with a 200-shaped body, so <img onerror> never fires and a missing
     image fails silently instead of showing its fallback. Only navigations get the shell. */
  const looksLikeAsset = path.extname(req.path) !== '';
  const wantsHtml = (req.get('accept') || '').includes('text/html');
  if (looksLikeAsset || !wantsHtml) return res.status(404).type('txt').send('Not found');

  res.status(404).sendFile(path.join(PUBLIC, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Something broke on our side. Nothing was sent.' });
});

/* Deployment notes, because vercel.json rejects comments and these are worth keeping.

   Everything, public/ included, is served through this Express app rather than split between
   Vercel's CDN and a function. The app owns the clean URLs and the 301s off the legacy .html
   paths, and splitting that across two routers is how those redirects quietly stop working.
   `includeFiles` in vercel.json is what puts public/ and data/ inside the bundle; without it
   the function boots and then 404s every asset.

   One region (bom1, Mumbai): the judges are in India, and holding to a single region also
   keeps the number of live instances down — which matters here because each instance carries
   its own in-memory database. See the storage note in db.js.

   maxDuration stays at the platform default. It belongs to the `functions` property, which
   Vercel refuses alongside `builds`, and `builds` is what carries includeFiles. */

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
