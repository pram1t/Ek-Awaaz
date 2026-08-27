/* Ek Awaaz — Smiti Didi's voice and ears.

   Sarvam for Indic speech, because it is trained on Indian languages, Indian accents and Indian
   place names. OpenAI voices reading Devanagari sound audibly foreign, and for a product whose
   whole argument is "say it in your own language" that mismatch is not cosmetic.

   Both keys live here and never reach the browser. The browser talks to /api/tts and /api/stt.

   Metered in rupees against its own ceiling, separate from the OpenAI budget, because they are
   separate pots of credit. TTS is cached hard: Smiti says the same forty-odd lines to every
   citizen, so the second person to hear a line costs nothing. */

import crypto from 'node:crypto';
import { cacheKey, cacheGet, cacheSet } from './guardrails.js';

const KEY = process.env.SARVAM_API_KEY || '';
const BASE = 'https://api.sarvam.ai';

const TTS_MODEL = process.env.SARVAM_TTS_MODEL || 'bulbul:v3';
const STT_MODEL = process.env.SARVAM_STT_MODEL || 'saaras:v3';
export const VOICE = process.env.SARVAM_VOICE || 'ritu';

/* Bulbul speaks eleven languages. Saaras understands far more. Conflating the two would be the
   same overclaim the language selector already refuses to make. */
const TTS_LANGS = ['bn-IN', 'en-IN', 'gu-IN', 'hi-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN',
                   'pa-IN', 'ta-IN', 'te-IN'];

const TTS_MAX_CHARS = 2500;          // bulbul:v3 hard limit
const STT_MAX_BYTES = 8 * 1024 * 1024;

/* ------------------------------------------------------------------- BUDGET ----- */

/* Published beta rates, Aug 2026: TTS Rs 30 per 10,000 characters, STT Rs 30 per hour.
   CHECK THESE — Bulbul v3 pricing doubled from v2 and may move again. */
const RATE_TTS_PER_CHAR = 30 / 10000;
const RATE_STT_PER_SECOND = 30 / 3600;
const CEILING_INR = Number(process.env.SARVAM_BUDGET_INR || 90);

const spend = { inr: 0, chars: 0, seconds: 0, ttsCalls: 0, sttCalls: 0, cachedTts: 0, blocked: 0 };

/* OPENAI_SPEECH — the second provider.
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
    return { audio, mime: 'audio/mpeg', lang, provider: 'openai', cached: false };
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
export const speechAvailable = () => (Boolean(KEY) && spend.inr < CEILING_INR) || openaiUsable();

export function speechReport() {
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

function speechReportPrimary() {
  return {
    provider: KEY ? 'sarvam' : 'none',
    voice: VOICE,
    ttsModel: TTS_MODEL,
    sttModel: STT_MODEL,
    ceilingInr: CEILING_INR,
    spentInr: Math.round(spend.inr * 100) / 100,
    remainingInr: Math.round((CEILING_INR - spend.inr) * 100) / 100,
    characters: spend.chars,
    seconds: Math.round(spend.seconds),
    ttsCalls: spend.ttsCalls,
    ttsFromCache: spend.cachedTts,
    sttCalls: spend.sttCalls,
    blocked: spend.blocked,
    ttsLanguages: TTS_LANGS.length,
    note: 'Rates are configured in server/speech.js and must be checked against current Sarvam pricing.'
  };
}

/* --------------------------------------------------------------------- TTS ----- */

function pickTtsLang(want) {
  const w = String(want || 'hi-IN');
  if (TTS_LANGS.includes(w)) return w;
  const two = w.slice(0, 2).toLowerCase();
  const near = TTS_LANGS.find((l) => l.slice(0, 2) === two);
  return near || 'hi-IN';
}

/* Bulbul refuses text with no character from the target language. Romanised Hindi sent as hi-IN
   comes back as an error, so route Latin-script text to en-IN and say so rather than failing. */
function looksLatin(text) {
  const letters = String(text).replace(/[^\p{L}]/gu, '');
  if (!letters) return true;
  const latin = letters.replace(/[^\p{Script=Latin}]/gu, '').length;
  return latin / letters.length > 0.6;
}

/**
 * @returns {{audio: Buffer, mime: string, lang: string, cached: boolean} | {error: string}}
 */
export async function speak(text, { lang = 'hi-IN', speaker = VOICE, pace = 0.95 } = {}) {
  const clean = String(text || '').trim();
  if (!clean) return { error: 'Nothing to say.' };
  /* No Sarvam key at all — go straight to the fallback rather than reporting no voice. */
  if (!KEY) return openaiSpeak(clean.slice(0, TTS_MAX_CHARS), pickTtsLang(lang));

  const trimmed = clean.slice(0, TTS_MAX_CHARS);
  let use = pickTtsLang(lang);
  if (looksLatin(trimmed) && use !== 'en-IN') use = 'en-IN';

  const key = cacheKey('tts', TTS_MODEL, speaker, use, String(pace), trimmed);
  const hit = cacheGet(key);
  if (hit) {
    spend.cachedTts += 1;
    return { audio: Buffer.from(hit, 'base64'), mime: 'audio/mpeg', lang: use, cached: true };
  }

  if (spend.inr + trimmed.length * RATE_TTS_PER_CHAR > CEILING_INR) {
    spend.blocked += 1;
    return { error: 'Speech budget for this prototype is used up.' };
  }

  try {
    const res = await fetch(BASE + '/text-to-speech', {
      method: 'POST',
      headers: { 'api-subscription-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: trimmed, language_code: use, model: TTS_MODEL,
        speaker, pace, output_audio_codec: 'mp3'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.audios || !data.audios[0]) {
      /* Sarvam refused. The words still need saying, so ask the other provider before giving up. */
      const second = await openaiSpeak(trimmed, use);
      if (!second.error) return { ...second, sarvamError: (data.error && data.error.message) || res.status };
      return { error: (data.error && data.error.message) || `Speech failed (${res.status}).` };
    }
    spend.chars += trimmed.length;
    spend.inr += trimmed.length * RATE_TTS_PER_CHAR;
    spend.ttsCalls += 1;
    cacheSet(key, data.audios[0]);
    return { audio: Buffer.from(data.audios[0], 'base64'), mime: 'audio/mpeg', lang: use, cached: false };
  } catch (err) {
    const second = await openaiSpeak(trimmed, use);
    if (!second.error) return second;
    return { error: 'Could not reach the speech service.' };
  }
}

/* --------------------------------------------------------------------- STT ----- */

/**
 * @param {Buffer} audio  raw bytes as uploaded by the browser (WebM/Opus from MediaRecorder)
 * @returns {{text: string, lang: string} | {error: string}}
 */
export async function listen(audio, { lang = 'unknown', filename = 'clip.webm', mime = 'audio/webm' } = {}) {
  if (!audio || !audio.length) return { error: 'No audio received.' };
  if (audio.length > STT_MAX_BYTES) return { error: 'That recording is too long.' };
  if (!KEY) return openaiListen(audio, { lang, filename, mime });

  /* Rough duration for metering. Opus at the browser default runs near 24 kbit/s; we bill on the
     estimate and reconcile nothing, so keep it pessimistic rather than flattering. */
  const seconds = Math.max(1, Math.round(audio.length / 3000));
  if (spend.inr + seconds * RATE_STT_PER_SECOND > CEILING_INR) {
    spend.blocked += 1;
    return { error: 'Speech budget for this prototype is used up.' };
  }

  try {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mime }), filename);
    form.append('model', STT_MODEL);
    /* 'unknown' lets Saaras detect it, which is what we want when the citizen has not told us. */
    form.append('language_code', lang || 'unknown');

    const res = await fetch(BASE + '/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': KEY },
      body: form
    });
    const data = await res.json();
    if (!res.ok || typeof data.transcript !== 'string') {
      /* Somebody just spoke a sentence. Losing it because one provider said no is not acceptable. */
      const second = await openaiListen(audio, { lang, filename, mime });
      if (!second.error) return second;
      return { error: (data.error && data.error.message) || `Could not hear that (${res.status}).` };
    }
    spend.seconds += seconds;
    spend.inr += seconds * RATE_STT_PER_SECOND;
    spend.sttCalls += 1;
    return {
      text: data.transcript.trim(),
      lang: data.language_code || lang,
      confidence: data.language_probability
    };
  } catch (err) {
    const second = await openaiListen(audio, { lang, filename, mime });
    if (!second.error) return second;
    return { error: 'Could not reach the speech service.' };
  }
}

export const ttsLanguages = () => TTS_LANGS.slice();
export const etag = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
