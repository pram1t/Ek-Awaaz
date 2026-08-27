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

export const speechAvailable = () => Boolean(KEY) && spend.inr < CEILING_INR;

export function speechReport() {
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
  if (!KEY) return { error: 'No speech key configured.' };

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
      return { error: (data.error && data.error.message) || `Speech failed (${res.status}).` };
    }
    spend.chars += trimmed.length;
    spend.inr += trimmed.length * RATE_TTS_PER_CHAR;
    spend.ttsCalls += 1;
    cacheSet(key, data.audios[0]);
    return { audio: Buffer.from(data.audios[0], 'base64'), mime: 'audio/mpeg', lang: use, cached: false };
  } catch (err) {
    return { error: 'Could not reach the speech service.' };
  }
}

/* --------------------------------------------------------------------- STT ----- */

/**
 * @param {Buffer} audio  raw bytes as uploaded by the browser (WebM/Opus from MediaRecorder)
 * @returns {{text: string, lang: string} | {error: string}}
 */
export async function listen(audio, { lang = 'unknown', filename = 'clip.webm', mime = 'audio/webm' } = {}) {
  if (!KEY) return { error: 'No speech key configured.' };
  if (!audio || !audio.length) return { error: 'No audio received.' };
  if (audio.length > STT_MAX_BYTES) return { error: 'That recording is too long.' };

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
    return { error: 'Could not reach the speech service.' };
  }
}

export const ttsLanguages = () => TTS_LANGS.slice();
export const etag = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
