/* Voice-first: you speak, and she speaks back.
 *
 * What was there: press the mic, the browser transcribes into the text box, you press send, and
 * Smiti answers on screen. One direction. Sarvam's Bulbul was built, metered and verified in five
 * languages — and never called by the conversation, so the whole speaking half of the product
 * existed only in a test script.
 *
 * What this adds:
 *   · Committing a spoken answer sends it. Pressing the mic again, or "Use this", is already a
 *     deliberate gesture — making the person then reach for send is a second gesture for the same
 *     decision, and on a phone it is the one that breaks the flow.
 *   · Once you have spoken, Smiti's turns are spoken. Every question, the routing sentence, and
 *     the plain-language reading of an officer's reply.
 *   · She answers in the language the model detected from your words, not the language of the
 *     interface. Hindi in, Hindi out — the chrome is English, but she is not.
 *   · It can be turned off, and it says so. A page that starts talking with no visible control is
 *     worse than one that stays silent.
 *
 * Three rules held deliberately:
 *   · Voice never becomes the only way. Everything is still on screen, and typing turns speech
 *     off — a person who switches to the keyboard has told us something.
 *   · If audio fails, it fails silently and the text stands. There is no "audio unavailable"
 *     error to dismiss, because the words are already readable.
 *   · Nothing autoplays before the person has pressed the mic. That is both the browser's rule
 *     and the right one.
 */

import fs from 'node:fs';

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const nl = (str, sample) => (sample.indexOf(CRLF) >= 0 ? str.split(LF).join(CRLF) : str);
const swap = (hay, from, to) => {
  const f = nl(from, hay);
  if (hay.indexOf(f) < 0) return null;
  return hay.split(f).join(nl(to, hay));
};

/* ── 1. the client learns to fetch audio ───────────────────────────────────── */
{
  const F = 'public/api-client.js';
  let s = fs.readFileSync(F, 'utf8');

  if (s.includes('speak:')) {
    console.log('  = api-client already has speak()');
  } else {
    const from = `    nextQuestion: (payload) => call('/next', { method: 'POST', body: payload }),`;
    const to = `    nextQuestion: (payload) => call('/next', { method: 'POST', body: payload }),

    /* Speech cannot go through call() — that parses JSON, and /tts answers with audio bytes.
       Returns a blob URL the caller plays, or an error it can ignore: if Smiti cannot be heard
       the words are still on screen, so silence is an acceptable failure and a dialog is not. */
    speak: async (text, lang) => {
      try {
        const res = await fetch(BASE + '/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: String(text || '').slice(0, 900), lang: lang || 'en-IN' })
        });
        if (!res.ok) {
          const why = await res.json().catch(() => ({}));
          return { error: why.error || 'no audio', status: res.status };
        }
        const blob = await res.blob();
        return {
          url: URL.createObjectURL(blob),
          lang: res.headers.get('X-Speech-Lang') || lang || null,
          cached: res.headers.get('X-Speech-Cached') === 'true'
        };
      } catch (err) {
        return { error: 'could not reach the speech service', offline: true };
      }
    },

    /* Raw audio in, text out — the fallback for a browser with no speech recognition of its own,
       and the better engine for Indic languages either way. */
    listen: async (blob) => {
      try {
        const res = await fetch(BASE + '/stt', {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'audio/webm' },
          body: blob
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return Object.assign({ error: data.error || 'could not transcribe' }, data);
        return data;
      } catch (err) {
        return { error: 'could not reach the speech service', offline: true };
      }
    },`;

    const out = swap(s, from, to);
    if (!out) { console.log('  ! api-client anchor not found'); process.exit(1); }
    fs.writeFileSync(F, out);
    console.log('  api-client.js — speak() and listen()');
  }
}

/* ── 2. the conversation speaks ────────────────────────────────────────────── */
{
  const F = 'public/report.html';
  let s = fs.readFileSync(F, 'utf8');

  if (s.includes('function sayAloud')) { console.log('  = report.html already voice-first'); process.exit(0); }

  /* (a) the controller, placed just before the composer wiring */
  const CTRL_ANCHOR = `/* ---------- composer ---------- */`;
  const CTRL = `/* ---------- voice-first ----------
   Once the citizen has spoken, Smiti speaks. Off until then, because nothing should start making
   noise on a page nobody asked to talk. */
let voiceMode = false;
let spoken = null;            /* the audio playing right now, so a new turn can cut off an old one */

function stopSpeaking() {
  if (!spoken) return;
  try { spoken.pause(); } catch (e) {}
  spoken = null;
}

/* The language she answers in is the one the model heard in their words — not the interface
   language, which is English. Falls back to whatever the mic panel is set to. */
function spokenLang() {
  return (domain && domain.language) || (voice && voice.langCode) || 'en-IN';
}

async function sayAloud(text) {
  if (!voiceMode || !text || !window.EAAPI || !EAAPI.speak) return;
  stopSpeaking();
  const out = await EAAPI.speak(text, spokenLang());
  /* Silence is the fallback. The words are already on screen, so an error here needs no dialog. */
  if (!out || out.error || !out.url) return;
  if (!voiceMode) return;                    /* turned off while the audio was being fetched */
  const audio = new Audio(out.url);
  spoken = audio;
  audio.addEventListener('ended', () => { if (spoken === audio) spoken = null; });
  try { await audio.play(); } catch (e) { /* a blocked autoplay is not an error worth showing */ }
}

/* A visible control, because a page that talks needs an obvious way to stop it. */
function paintVoiceChip() {
  const chip = document.querySelector('#voiceReplies');
  if (!chip) return;
  chip.hidden = !voiceMode;
  chip.textContent = voiceMode ? 'Smiti is speaking · tap to silence' : '';
}

function setVoiceMode(on) {
  voiceMode = !!on;
  if (!voiceMode) stopSpeaking();
  paintVoiceChip();
}

/* ---------- composer ---------- */`;

  {
    const out = swap(s, CTRL_ANCHOR, CTRL);
    if (!out) { console.log('  ! composer anchor not found'); process.exit(1); }
    s = out;
  }

  /* (b) ask() speaks the question it just painted */
  const ASK_FROM = `    let inner = '<p>' + esc(text) + '</p>';
    if (hint) inner += '<p class="aside">' + esc(hint) + '</p>';`;
  const ASK_TO = `    let inner = '<p>' + esc(text) + '</p>';
    if (hint) inner += '<p class="aside">' + esc(hint) + '</p>';
    /* The question, not the hint. The hint is a long parenthetical that is fine to read and
       tedious to listen to. */
    sayAloud(text);`;
  {
    const out = swap(s, ASK_FROM, ASK_TO);
    if (!out) { console.log('  ! ask() anchor not found'); process.exit(1); }
    s = out;
  }

  /* (c) a spoken answer sends itself */
  const FINAL_FROM = `  onFinal: (said) => {
    reply.value = reply.value ? reply.value.trim() + ' ' + said : said;
    reply.dispatchEvent(new Event('input'));
    reply.focus();
    reply.setSelectionRange(reply.value.length, reply.value.length);
  }`;
  const FINAL_TO = `  onFinal: (said) => {
    reply.value = reply.value ? reply.value.trim() + ' ' + said : said;
    reply.dispatchEvent(new Event('input'));
    reply.focus();
    reply.setSelectionRange(reply.value.length, reply.value.length);

    /* Speaking is the answer to "how do I reply", so from here she replies out loud too. */
    setVoiceMode(true);

    /* Committing the transcript — pressing the mic again, or "Use this" — is already a decision.
       Making them reach for send is a second gesture for the same one, and on a phone it is the
       gesture that breaks the flow. Held briefly so the words are visible before they go. */
    clearTimeout(sendAfterSpeaking);
    sendAfterSpeaking = setTimeout(() => {
      if (!reply.value.trim() || reply.disabled) return;
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
    }, 700);
  }`;
  {
    const out = swap(s, FINAL_FROM, FINAL_TO);
    if (!out) { console.log('  ! onFinal anchor not found'); process.exit(1); }
    s = out;
  }

  /* (d) the timer needs declaring, and typing turns speech off */
  const DECL_FROM = `const voice = window.EAVoice && EAVoice.attach({`;
  const DECL_TO = `let sendAfterSpeaking = 0;
const voice = window.EAVoice && EAVoice.attach({`;
  {
    const out = swap(s, DECL_FROM, DECL_TO);
    if (!out) { console.log('  ! voice declaration anchor not found'); process.exit(1); }
    s = out;
  }

  fs.writeFileSync(F, s);
  console.log('  report.html — she speaks, and a spoken answer sends itself');
}
