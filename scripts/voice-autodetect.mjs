/* Stop asking which language. Detect it, and never let the browser guess.
 *
 * Two things went wrong at once, and they had the same root.
 *
 * A screenshot came back with Odia selected in the picker and the transcript reading
 * "I'm going to organ body control". That is Chrome's own speech recogniser, which has no Odia,
 * being handed od-IN and producing confident English nonsense. And because the code preferred
 * browser text whenever browser text existed — on the reasoning that it is instant and free — the
 * nonsense won over Sarvam, which transcribes Odia correctly.
 *
 * Measured, both directions, five languages: Sarvam returns the exact sentence in the right script
 * every time, and it does it with NO language hint at all — Kannada, Odia, Tamil, Telugu, Bengali,
 * Hindi and English were each detected correctly from the audio alone.
 *
 * So the design was wrong in two ways, and both are removed:
 *
 *   · The picker is gone. Nobody should have to name their own language to a machine that can hear
 *     it. The audio goes up with no hint and comes back with text and the language it was spoken
 *     in, and that detected language is what Smiti answers in.
 *
 *   · The browser recogniser no longer produces answers. It is confidently wrong for exactly the
 *     languages this product exists for, and a confident wrong answer is worse than a slow right
 *     one. Sarvam transcribes; OpenAI covers if Sarvam cannot.
 *
 * The cost is the live word-by-word transcript, which came from the browser. In exchange, an Odia
 * speaker gets their sentence instead of "organ body control". The meter still moves with their
 * voice, so the screen is never dead — it says it is listening, then it shows what they said.
 */

import fs from 'node:fs';

const F = 'public/voice.js';
let lines = fs.readFileSync(F, 'utf8').split('\n');

if (lines.some((l) => l.includes('AUTODETECT'))) { console.log('= already applied'); process.exit(0); }

const at = (needle, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && l.includes(needle));
  if (i < 0) throw new Error('not found: ' + needle);
  return i;
};
const cut = (startNeedle, endNeedle, { inclusive = true } = {}) => {
  const a = at(startNeedle);
  const b = at(endNeedle, a);
  lines.splice(a, (inclusive ? b - a + 1 : b - a));
};

/* ── 1. the language list and the picker go ────────────────────────────────── */
cut('const LANGS = [', '  ];');
cut("let langIndex = LANGS.findIndex", 'if (langIndex < 0) langIndex = 0;');
cut("const lang = document.createElement('select');", "lang.setAttribute('aria-label', 'The language you are speaking');");
lines[at('panel.append(meter, text, lang);')] = '    panel.append(meter, text);';
cut("lang.addEventListener('change', () => {", '    });');
cut('function setLang(code) {', '    }');

/* ── 2. the browser recogniser stops answering ─────────────────────────────── */
{
  /* everything from the !SR guard through rec.start() is the recognition path */
  const a = at('if (!SR) {');
  const b = at("try { rec.start(); } catch (_) { say('Could not start listening. Type instead.'); }", a);
  lines.splice(a, b - a + 1,
    '      /* AUTODETECT — the browser does not transcribe here any more.',
    '         Chrome has no recogniser for most Indian languages, and when handed one it does not',
    '         know it returns confident English nonsense: an Odia sentence came back as',
    '         "I\'m going to organ body control". A confident wrong answer is worse than a slow',
    '         right one, so the recording goes to Sarvam, which detects the language from the audio',
    '         and returns the sentence in its own script. */',
    '      if (!recorder) {',
    "        say('This browser cannot record. Please type instead.');",
    '        return;',
    '      }',
    "      say('Listening…');");
}

/* ── 3. on stop, always transcribe the recording ───────────────────────────── */
{
  const a = at("const said = (finalText + ' ' + interimText).trim();");
  const b = at('      });', a);
  lines.splice(a, b - a + 1,
    "      finalText = ''; interimText = '';",
    '',
    '      const hadRecorder = recorder;',
    '      if (recorder) { try { recorder.stop(); } catch (_) {} recorder = null; }',
    '',
    '      if (!commit) { chunks = []; return; }',
    '      if (!hadRecorder || !chunks.length || !window.EAAPI || !EAAPI.listen) { chunks = []; return; }',
    '',
    "      const blob = new Blob(chunks, { type: hadRecorder.mimeType || 'audio/webm' });",
    '      chunks = [];',
    '',
    '      /* Reopen the bar just to say what is happening: transcription takes about a second, and',
    '         a screen that goes blank in that second reads as a failure. */',
    "      host.classList.add('ea-open');",
    '      reveal();',
    "      say('Writing down what you said…');",
    '      if (opts.onTranscribing) opts.onTranscribing();',
    '',
    '      /* No language hint. Sarvam detects it from the audio, and the language it reports is what',
    '         Smiti will answer in. */',
    '      EAAPI.listen(blob).then((out) => {',
    "        const heard = out && !out.error ? String(out.text || out.transcript || '').trim() : '';",
    '        conceal();',
    "        host.classList.remove('ea-open');",
    '        if (heard) {',
    '          detected = out.lang || null;',
    '          if (onFinal) onFinal(heard, detected);',
    '          return;',
    '        }',
    '        /* Never silently drop what somebody said. */',
    '        if (opts.onTranscribeFailed) opts.onTranscribeFailed(out && out.error);',
    '      });');
}

/* ── 4. remember what was detected, and expose it ──────────────────────────── */
{
  const i = at('let recorder = null, chunks = [];');
  lines.splice(i + 1, 0,
    '    /* The language Sarvam heard, so the reply can be spoken in it. */',
    '    let detected = null;');
}
{
  const i = at('return { start, stop, setLang, el: host, button: btn, panel: panel, supported: !!SR,');
  lines[i] = '    return { start, stop, el: host, button: btn, panel: panel,';
  const j = at('get langPicked() { return picked; },', i);
  lines.splice(i + 1, j - i,
    '             /* Whatever language the citizen was actually heard speaking. */',
    '             get langCode() { return detected; },',
    '             get langPicked() { return Boolean(detected); },');
}

/* ── 5. tidy the remains ───────────────────────────────────────────────────── */
lines = lines.filter((l) => !l.includes('let picked = false;'));
{
  const i = at('const { button, mount, onFinal, onInterim } = opts;');
  lines[i] = '    const { button, mount, onFinal } = opts;';
}

fs.writeFileSync(F, lines.join('\n'));
console.log('voice.js — the language is detected from the audio; the browser no longer guesses');
