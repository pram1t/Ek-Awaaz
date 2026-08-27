/* Live voice: stop talking, and it sends.
 *
 * "Use this" was a required button, so the flow was speak → look for a button → press it → wait.
 * That is a form with a microphone attached, not a conversation. A person talking to someone does
 * not press anything to indicate they have finished; they stop talking, and the other person
 * answers.
 *
 * So the microphone now decides for itself. The analyser already runs every frame to drive the
 * level meter, and it knows the real amplitude — so it also knows silence. Once speech has been
 * heard and then the level stays down for a beat and a half, the turn is committed and sent.
 *
 * Details that decide whether this feels alive or broken:
 *   · Silence only counts after speech. Otherwise the first second of a quiet room would submit an
 *     empty turn before anyone said anything.
 *   · 1500ms. Shorter cuts people off mid-sentence when they pause to think; longer feels dead.
 *   · A hard 45-second cap, so a phone left face-up in a pocket cannot record forever.
 *   · The panel says what is about to happen. Auto-submit that gives no warning is alarming the
 *     first time, and this is a government service where the first time is what matters.
 *   · The button stays, relabelled "Send now" — for a noisy room where the level never drops, and
 *     for anyone who would rather decide themselves. It is an override now, not a requirement.
 */

import fs from 'node:fs';

const F = 'public/voice.js';
let src = fs.readFileSync(F, 'utf8');

if (src.includes('SILENCE_MS')) { console.log('= already applied'); process.exit(0); }

const lines = src.split('\n');
const at = (needle, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && l.includes(needle));
  if (i < 0) throw new Error('not found: ' + needle);
  return i;
};

/* ── 1. the constants ──────────────────────────────────────────────────────── */
{
  const i = at('const BARS = 28;');
  lines.splice(i + 1, 0,
    '',
    '  /* Live commit. Once speech has been heard, this much quiet ends the turn and sends it.',
    '     1500ms: shorter cuts people off when they pause to think, longer feels dead. */',
    '  const SILENCE_MS = 1500;',
    '  /* Speech is anything above this share of full scale. Below it is room noise. */',
    '  const SPEECH_LEVEL = 0.055;',
    '  /* A phone left face-up must not record forever. */',
    '  const MAX_TURN_MS = 45000;');
}

/* ── 2. per-attach state ───────────────────────────────────────────────────── */
{
  const i = at('let recorder = null, chunks = [];');
  lines.splice(i + 1, 0,
    '    /* Live-commit state: whether we have heard anything yet, when the quiet began, and the',
    '       two timers that end a turn. */',
    '    let heardSpeech = false, quietSince = 0, autoTimer = 0, capTimer = 0;');
}

/* ── 3. the meter loop also watches for the end of the sentence ─────────────── */
{
  const i = at('      raf = requestAnimationFrame(loop);');
  lines.splice(i, 0,
    '',
    '      /* The analyser is already running for the meter, so it can also tell when the person has',
    '         stopped. Peak rather than mean: a mean across all bins is dragged down by the empty',
    '         high end and reads as silence during ordinary speech. */',
    '      let peak = 0;',
    '      for (let i = 0; i < data.length; i++) if (data[i] > peak) peak = data[i];',
    '      const level = peak / 255;',
    '',
    '      if (level > SPEECH_LEVEL) {',
    '        heardSpeech = true;',
    '        quietSince = 0;',
    '        say2(\'Listening…\');',
    '      } else if (heardSpeech) {',
    '        const now = performance.now();',
    '        if (!quietSince) quietSince = now;',
    '        else if (now - quietSince > SILENCE_MS) { commitLive(); return; }',
    '        else if (now - quietSince > 500) say2(\'Sending in a moment — keep talking to continue.\');',
    '      }');
}

/* ── 4. the two helpers ────────────────────────────────────────────────────── */
{
  const i = at('    function stop(commit) {');
  lines.splice(i, 0,
    '    /* A status line that does not wipe the transcript. say() clears the text; this only',
    '       replaces the hint when there is nothing transcribed yet, so a live transcript is never',
    '       overwritten by a status message. */',
    '    function say2(msg) {',
    '      if (finalText || interimText) return;',
    '      if (text.textContent !== msg) text.textContent = msg;',
    '    }',
    '',
    '    /* The person stopped talking. End the turn and hand it over. */',
    '    function commitLive() {',
    '      if (!open) return;',
    '      stop(true);',
    '    }',
    '');
}

/* ── 5. reset the state on each start, and cap the turn ─────────────────────── */
{
  const i = at("      finalText = ''; interimText = '';", at('async function start()'));
  lines.splice(i + 1, 0,
    '      heardSpeech = false; quietSince = 0;',
    '      clearTimeout(capTimer);',
    '      capTimer = setTimeout(() => { if (open) commitLive(); }, MAX_TURN_MS);');
}

/* ── 6. clear the timers when a turn ends ──────────────────────────────────── */
{
  const i = at('    function stop(commit) {');
  lines.splice(i + 1, 0,
    '      clearTimeout(autoTimer); autoTimer = 0;',
    '      clearTimeout(capTimer); capTimer = 0;',
    '      heardSpeech = false; quietSince = 0;');
}

/* ── 7. the button is an override, not a requirement ───────────────────────── */
{
  const i = at("use.textContent = 'Use this';");
  lines[i] = "    use.textContent = 'Send now';";
  const j = at("aria-label', 'Stop and use what I said'");
  lines[j] = lines[j].replace('Stop and use what I said', 'Stop and send what I said');
}

fs.writeFileSync(F, lines.join('\n'));
console.log('voice.js — the turn ends when the speaking does');
