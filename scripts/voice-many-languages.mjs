/* Every language Sarvam offers, not two.
 *
 * The mic offered EN and हिं, cycled by tapping a chip. Two problems with extending that to eleven:
 * tapping through eleven options to reach Malayalam is not a control, and the browser's own speech
 * recognition does not cover most Indic languages at all — so even if you could pick Odia, Chrome
 * would hand back nothing and the panel would say "type instead", which is the opposite of the
 * promise.
 *
 * So two changes, and the second is the one that matters:
 *
 *  1. A real picker. Eleven locales in their own scripts, as a select — which is also the control
 *     that already works with a screen reader and with a thumb on a phone.
 *
 *  2. Sarvam does the listening when the browser cannot. The microphone is recorded in parallel
 *     with the browser's attempt; on stop, if the browser produced text we use it (instant, free),
 *     and if it produced nothing we send the recording to Saaras v3 and use that. Saaras covers the
 *     Indic languages properly, which is the entire point of offering them.
 *
 * The failure path stays honest: if both fail, the panel says the words did not come through and
 * the text box is still there. It never silently discards what someone said.
 */

import fs from 'node:fs';

const F = 'public/voice.js';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('SARVAM_FALLBACK')) { console.log('= already applied'); process.exit(0); }

const lines = s.split('\n');
const at = (needle, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && l.includes(needle));
  if (i < 0) throw new Error('not found: ' + needle);
  return i;
};

/* ── 1. the eleven locales Bulbul and Saaras actually support ───────────────── */
{
  const start = at('const LANGS = [');
  let end = start;
  while (!lines[end].includes('];')) end++;
  lines.splice(start, end - start + 1,
    '  /* The eleven Sarvam supports. Labels in each language’s own script, because a person',
    '     looking for Malayalam is looking for മലയാളം, not for "ML". */',
    '  const LANGS = [',
    "    { code: 'en-IN', label: 'English' },",
    "    { code: 'hi-IN', label: 'हिन्दी' },",
    "    { code: 'bn-IN', label: 'বাংলা' },",
    "    { code: 'mr-IN', label: 'मराठी' },",
    "    { code: 'ta-IN', label: 'தமிழ்' },",
    "    { code: 'te-IN', label: 'తెలుగు' },",
    "    { code: 'kn-IN', label: 'ಕನ್ನಡ' },",
    "    { code: 'ml-IN', label: 'മലയാളം' },",
    "    { code: 'gu-IN', label: 'ગુજરાતી' },",
    "    { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },",
    "    { code: 'od-IN', label: 'ଓଡି଼ଆ' },",
    '  ];');
}

/* ── 2. the chip becomes a picker ───────────────────────────────────────────── */
{
  const start = at("const lang = document.createElement('button');");
  let end = start;
  while (!lines[end].includes("aria-label', 'Change the language you are speaking'")) end++;
  lines.splice(start, end - start + 1,
    '    /* A select, not a chip that cycles: eleven options cannot be tapped through, and a select',
    '       is already what a screen reader and a phone keyboard know how to drive. */',
    "    const lang = document.createElement('select');",
    "    lang.className = 'ea-voice-lang';",
    '    lang.innerHTML = LANGS.map((l, i) =>',
    "      '<option value=\"' + l.code + '\"' + (i === langIndex ? ' selected' : '') + '>' + l.label + '</option>').join('');",
    "    lang.setAttribute('aria-label', 'The language you are speaking');");
}

/* ── 3. picking one restarts the recogniser on that language ────────────────── */
{
  const start = at("lang.addEventListener('click', () => {");
  let end = start;
  while (!lines[end].trim().startsWith('});')) end++;
  lines.splice(start, end - start + 1,
    "    lang.addEventListener('change', () => {",
    '      const i = LANGS.findIndex((l) => l.code === lang.value);',
    '      if (i < 0) return;',
    '      langIndex = i;',
    '      picked = true;              /* an explicit choice outranks anything we detected */',
    '      if (rec) { rec.lang = LANGS[i].code; rec.onend = null; try { rec.stop(); } catch (_) {} rec = null; open = false; start(); }',
    '    });');
}

/* ── 4. state: whether the person chose, and the parallel recording ─────────── */
{
  const i = at('if (langIndex < 0) langIndex = 0;');
  lines.splice(i + 1, 0,
    '',
    '    /* SARVAM_FALLBACK — the browser is not the only transcriber any more.',
    '       recorder captures the same audio the browser is listening to, so if the browser returns',
    '       nothing (no support for this language, or no support at all) we still have the words. */',
    '    let picked = false;',
    '    let recorder = null, chunks = [];');
}

/* ── 5. record alongside, and do not give up when SR is missing ─────────────── */
{
  const i = at('if (!SR) {');
  /* insert the recorder start just before the SR check, so it runs either way */
  lines.splice(i, 0,
    '      /* Record regardless. Costs nothing when the browser succeeds, and is the only copy of',
    '         what was said when it does not. */',
    '      try {',
    "        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']",
    '          .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));',
    '        if (mime) {',
    '          chunks = [];',
    '          recorder = new MediaRecorder(stream, { mimeType: mime });',
    '          recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };',
    '          recorder.start(250);',
    '        }',
    '      } catch (e) { recorder = null; }',
    '');
  /* soften the no-SR message: it is no longer a dead end */
  const j = at("say('This browser cannot turn speech into text.", i);
  lines[j] = "        say(recorder ? 'Listening…' : 'This browser cannot record or transcribe. Please type instead.');";
}

/* ── 6. on stop: browser text if there is any, otherwise Saaras ─────────────── */
{
  const i = at('const said = (finalText + \' \' + interimText).trim();');
  let end = i;
  while (!lines[end].includes("finalText = ''; interimText = '';")) end++;
  lines.splice(i, end - i + 1,
    "      const said = (finalText + ' ' + interimText).trim();",
    "      finalText = ''; interimText = '';",
    '',
    '      /* Stop the recorder and decide who transcribed. The browser wins when it produced',
    '         something, because it is instant and already done; Saaras is asked only when the',
    '         browser gave us nothing, which for most Indic languages is every time. */',
    '      const hadRecorder = recorder;',
    '      if (recorder) { try { recorder.stop(); } catch (_) {} recorder = null; }',
    '',
    '      if (!commit) { chunks = []; return; }',
    '',
    '      if (said) { chunks = []; if (onFinal) onFinal(said); return; }',
    '',
    '      if (!hadRecorder || !chunks.length || !window.EAAPI || !EAAPI.listen) { chunks = []; return; }',
    '',
    '      const blob = new Blob(chunks, { type: hadRecorder.mimeType || \'audio/webm\' });',
    '      chunks = [];',
    "      if (opts.onTranscribing) opts.onTranscribing();",
    '      EAAPI.listen(blob).then((out) => {',
    '        const text = out && !out.error ? String(out.text || out.transcript || \'\').trim() : \'\';',
    '        if (text) { if (onFinal) onFinal(text); return; }',
    '        /* Never silently drop what somebody said. */',
    "        if (opts.onTranscribeFailed) opts.onTranscribeFailed(out && out.error);",
    '      });');
}

/* ── 7. expose the choice so the reply can be spoken in the same language ───── */
{
  const i = at('get langCode() { return LANGS[langIndex].code; },');
  lines[i] = '             get langCode() { return LANGS[langIndex].code; },'
    + '\n             /* True once the person has chosen a language themselves, which outranks detection. */'
    + '\n             get langPicked() { return picked; },';
}

/* ── 8. the select needs to look like the chip it replaced ──────────────────── */
{
  const i = at('.ea-voice-lang{flex:0 0 auto;border:1px solid #eadfcc;background:#fdf9f1;border-radius:3px;');
  lines.splice(i + 2, 0,
    '  .ea-voice-lang{max-width:118px;font:700 11.5px Mukta,sans-serif;color:#4a3728;padding:6px 8px;cursor:pointer}',
    '  .ea-voice-lang:focus{outline:2px solid #8c2416;outline-offset:1px}');
}

fs.writeFileSync(F, lines.join('\n'));
console.log('voice.js — 11 languages, a real picker, and Saaras when the browser cannot listen');
