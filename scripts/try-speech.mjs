/* Exercise /api/tts through the server, with real UTF-8.

   Also checks the two things that are easy to get wrong and expensive to discover late:
   the cache actually hitting on a repeated line, and romanised Hindi being routed to en-IN
   rather than failing against Bulbul's "must contain a character from the target language". */

import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.OUT || '.';

const LINES = [
  ['open-hi', 'hi-IN', 'क्या हुआ? अपनी भाषा में बताइए।'],
  ['route-hi', 'hi-IN', 'यह गाँव की सड़क है, तो यह पंचायत का काम है। दिल्ली नहीं जाएगी।'],
  ['open-hi-again', 'hi-IN', 'क्या हुआ? अपनी भाषा में बताइए।'],   // must come from cache
  ['latin-hinglish', 'hi-IN', 'Gaon ki sadak ka kaam panchayat ka hai.'], // must route to en-IN
  ['open-en', 'en-IN', 'Tell me what happened, in your own words.']
];

for (const [name, lang, text] of LINES) {
  const res = await fetch(BASE + '/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ text, lang })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    console.log(`${name.padEnd(16)} FAILED ${res.status}  ${e.error || ''}`);
    continue;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const file = path.join(OUT, `smiti-${name}.mp3`);
  fs.writeFileSync(file, buf);
  console.log(
    `${name.padEnd(16)} ${String(buf.length).padStart(7)} bytes  ` +
    `lang=${res.headers.get('x-speech-lang')}  cached=${res.headers.get('x-speech-cached')}  ` +
    `chars=${text.length}`
  );
}

const h = await (await fetch(BASE + '/api/health')).json();
const s = h.speech;
console.log(`\nspent ₹${s.spentInr} of ₹${s.ceilingInr}  ·  ${s.characters} chars  ` +
            `·  ${s.ttsCalls} calls, ${s.ttsFromCache} from cache`);
