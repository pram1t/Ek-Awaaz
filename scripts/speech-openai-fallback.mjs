/* When Sarvam cannot speak or listen, OpenAI does.
 *
 * Sarvam is the better choice for Indic voice and stays first: Bulbul's Hindi and Tamil are
 * noticeably better than a general-purpose model's, and its rupee ceiling is already metered. But
 * a single provider means a single point of failure on the one feature the whole product is now
 * built around — and there are three ways it fails that have nothing to do with our code: no key
 * configured, the rupee ceiling reached, or their API refusing a request.
 *
 * So every path becomes: try Sarvam, and if it cannot answer, try OpenAI with the key that is
 * already here for the conversation. The caller is told which provider answered, because a demo
 * that quietly degrades is a demo that lies.
 *
 * Two details that matter:
 *   · Language codes differ. Sarvam wants hi-IN; OpenAI's transcription wants ISO-639-1 "hi".
 *     Passing the wrong shape is a silent quality loss, not an error, which is the worst kind.
 *   · OpenAI speech is metered separately in dollars against its own ceiling. Sharing the model
 *     budget would let a chatty voice session eat the reasoning budget the intake depends on.
 */

import fs from 'node:fs';

const F = 'server/speech.js';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('OPENAI_SPEECH')) { console.log('= already applied'); process.exit(0); }

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const nl = (t) => (s.indexOf(CRLF) >= 0 ? t.split(LF).join(CRLF) : t);
const swap = (from, to) => {
  const f = nl(from);
  if (s.indexOf(f) < 0) throw new Error('anchor not found: ' + from.slice(0, 50));
  s = s.split(f).join(nl(to));
};

/* ── the fallback provider ─────────────────────────────────────────────────── */
swap(
  `export const speechAvailable = () => Boolean(KEY) && spend.inr < CEILING_INR;`,
  `/* OPENAI_SPEECH — the second provider.
   Sarvam stays first because its Indic voices are better and already metered in rupees. This is
   what answers when Sarvam has no key, has spent its ceiling, or refuses the request. */
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE = 'https://api.openai.com/v1';
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'tts-1';
const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE || 'nova';
const OPENAI_STT_MODEL = process.env.OPENAI_STT_MODEL || 'whisper-1';

/* Published rates at the time of writing. Wrong numbers here would make the cost claim wrong, so
   they are named and overridable rather than buried. */
const USD_TTS_PER_1K_CHARS = Number(process.env.OPENAI_TTS_USD_PER_1K || 0.015);
const USD_STT_PER_MINUTE = Number(process.env.OPENAI_STT_USD_PER_MIN || 0.006);
const OPENAI_SPEECH_CEILING_USD = Number(process.env.OPENAI_SPEECH_BUDGET_USD || 1.5);

const oa = { usd: 0, ttsCalls: 0, sttCalls: 0, chars: 0, seconds: 0, blocked: 0, errors: 0 };

/* Sarvam speaks hi-IN; OpenAI transcription wants ISO-639-1. Passing the wrong shape is a silent
   quality loss rather than an error, which is why this is a function and not an inline slice. */
const iso2 = (code) => String(code || '').slice(0, 2).toLowerCase() || undefined;

const openaiUsable = () => Boolean(OPENAI_KEY) && oa.usd < OPENAI_SPEECH_CEILING_USD;

async function openaiSpeak(text, lang) {
  if (!openaiUsable()) { oa.blocked += 1; return { error: 'No fallback speech available.' }; }
  const cost = (text.length / 1000) * USD_TTS_PER_1K_CHARS;
  if (oa.usd + cost > OPENAI_SPEECH_CEILING_USD) { oa.blocked += 1; return { error: 'Fallback speech budget used up.' }; }
  try {
    const res = await fetch(OPENAI_BASE + '/audio/speech', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + OPENAI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_TTS_MODEL, voice: OPENAI_TTS_VOICE, input: text, response_format: 'mp3'
      })
    });
    if (!res.ok) {
      oa.errors += 1;
      return { error: 'Fallback speech failed (' + res.status + ').' };
    }
    const audio = Buffer.from(await res.arrayBuffer());
    oa.usd += cost; oa.chars += text.length; oa.ttsCalls += 1;
    return { audio, mime: 'audio/mpeg', lang, provider: 'openai' };
  } catch (err) {
    oa.errors += 1;
    return { error: 'Could not reach the fallback speech service.' };
  }
}

async function openaiListen(audio, { lang, filename, mime }) {
  if (!openaiUsable()) { oa.blocked += 1; return { error: 'No fallback transcription available.' }; }
  const seconds = Math.max(1, Math.round(audio.length / 3000));
  const cost = (seconds / 60) * USD_STT_PER_MINUTE;
  if (oa.usd + cost > OPENAI_SPEECH_CEILING_USD) { oa.blocked += 1; return { error: 'Fallback speech budget used up.' }; }
  try {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mime || 'audio/webm' }), filename || 'clip.webm');
    form.append('model', OPENAI_STT_MODEL);
    const two = iso2(lang);
    /* 'unknown' means the citizen has not told us; let it detect rather than forcing a guess. */
    if (two && two !== 'un') form.append('language', two);
    const res = await fetch(OPENAI_BASE + '/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + OPENAI_KEY },
      body: form
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.text !== 'string') {
      oa.errors += 1;
      return { error: (data.error && data.error.message) || 'Could not hear that (' + res.status + ').' };
    }
    oa.usd += cost; oa.seconds += seconds; oa.sttCalls += 1;
    return { text: data.text.trim(), lang: lang, provider: 'openai' };
  } catch (err) {
    oa.errors += 1;
    return { error: 'Could not reach the fallback transcription service.' };
  }
}

/* Available if either provider can answer. */
export const speechAvailable = () => (Boolean(KEY) && spend.inr < CEILING_INR) || openaiUsable();`
);

/* ── speak(): Sarvam first, OpenAI second ──────────────────────────────────── */
swap(
  `  const clean = String(text || '').trim();
  if (!clean) return { error: 'Nothing to say.' };
  if (!KEY) return { error: 'No speech key configured.' };`,
  `  const clean = String(text || '').trim();
  if (!clean) return { error: 'Nothing to say.' };
  /* No Sarvam key at all — go straight to the fallback rather than reporting no voice. */
  if (!KEY) return openaiSpeak(clean.slice(0, TTS_MAX_CHARS), pickTtsLang(lang));`
);

swap(
  `    const data = await res.json();
    if (!res.ok || !data.audios || !data.audios[0]) {
      return { error: (data.error && data.error.message) || \`Speech failed (\${res.status}).\` };
    }`,
  `    const data = await res.json();
    if (!res.ok || !data.audios || !data.audios[0]) {
      /* Sarvam refused. The words still need saying, so ask the other provider before giving up. */
      const second = await openaiSpeak(trimmed, use);
      if (!second.error) return { ...second, sarvamError: (data.error && data.error.message) || res.status };
      return { error: (data.error && data.error.message) || \`Speech failed (\${res.status}).\` };
    }`
);

swap(
  `  } catch (err) {
    return { error: 'Could not reach the speech service.' };
  }
}

/* --------------------------------------------------------------------- STT ----- */`,
  `  } catch (err) {
    const second = await openaiSpeak(trimmed, use);
    if (!second.error) return second;
    return { error: 'Could not reach the speech service.' };
  }
}

/* --------------------------------------------------------------------- STT ----- */`
);

/* ── listen(): same shape ──────────────────────────────────────────────────── */
swap(
  `  if (!KEY) return { error: 'No speech key configured.' };
  if (!audio || !audio.length) return { error: 'No audio received.' };
  if (audio.length > STT_MAX_BYTES) return { error: 'That recording is too long.' };`,
  `  if (!audio || !audio.length) return { error: 'No audio received.' };
  if (audio.length > STT_MAX_BYTES) return { error: 'That recording is too long.' };
  if (!KEY) return openaiListen(audio, { lang, filename, mime });`
);

swap(
  `    const data = await res.json();
    if (!res.ok || typeof data.transcript !== 'string') {
      return { error: (data.error && data.error.message) || \`Could not hear that (\${res.status}).\` };
    }`,
  `    const data = await res.json();
    if (!res.ok || typeof data.transcript !== 'string') {
      /* Somebody just spoke a sentence. Losing it because one provider said no is not acceptable. */
      const second = await openaiListen(audio, { lang, filename, mime });
      if (!second.error) return second;
      return { error: (data.error && data.error.message) || \`Could not hear that (\${res.status}).\` };
    }`
);

swap(
  `  } catch (err) {
    return { error: 'Could not reach the speech service.' };
  }
}

export const ttsLanguages = () => TTS_LANGS.slice();`,
  `  } catch (err) {
    const second = await openaiListen(audio, { lang, filename, mime });
    if (!second.error) return second;
    return { error: 'Could not reach the speech service.' };
  }
}

export const ttsLanguages = () => TTS_LANGS.slice();`
);

/* ── report both providers ─────────────────────────────────────────────────── */
swap(
  `export function speechReport() {`,
  `export function speechReport() {
  /* Both providers, named. A demo that silently degrades to a different engine is a demo that
     misreports what it is. */
  const fallback = {
    configured: Boolean(OPENAI_KEY),
    ttsModel: OPENAI_TTS_MODEL,
    sttModel: OPENAI_STT_MODEL,
    voice: OPENAI_TTS_VOICE,
    ceilingUsd: OPENAI_SPEECH_CEILING_USD,
    spentUsd: Number(oa.usd.toFixed(6)),
    ttsCalls: oa.ttsCalls,
    sttCalls: oa.sttCalls,
    blocked: oa.blocked,
    errors: oa.errors
  };
  return Object.assign({ fallback }, speechReportPrimary());
}

function speechReportPrimary() {`
);

fs.writeFileSync(F, s);
console.log('speech.js — Sarvam first, OpenAI when it cannot answer, both reported');
