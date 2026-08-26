/* Ek Awaaz — one process serves the existing static pages AND the API.
   No file moves, no build step, no framework. `npm start` and it is live. */

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './server/api.js';
import { aiAvailable } from './server/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// Never cache the API; the browser must always see current signature counts.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', api);

// Working files are not part of the prototype and must not be served.
const BLOCKED = ['/uploads', '/screenshots', '/.thumbnail', '/.git'];
app.use((req, res, next) => {
  if (BLOCKED.some((p) => req.path.toLowerCase().startsWith(p)) || req.path.endsWith('.dc.html')) {
    return res.status(404).send('Not found');
  }
  next();
});

app.use(express.static(__dirname, { extensions: ['html'], index: 'index.html' }));

app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'No such endpoint.' });
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Something broke on our side. Nothing was sent.' });
});

app.listen(PORT, () => {
  console.log(`\n  Ek Awaaz  →  http://localhost:${PORT}`);
  console.log(`  API       →  http://localhost:${PORT}/api/health`);
  console.log(`  Model     →  ${aiAvailable() ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') + ' (live)' : 'NO API KEY — deterministic fallback active'}`);
  console.log(`  Mock OTP  →  ${process.env.MOCK_OTP || '123456'}\n`);
});
