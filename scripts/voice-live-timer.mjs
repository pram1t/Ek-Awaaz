/* Silence detection must not depend on the page being visible.
 *
 * The first version did the listening-for-silence inside the meter's requestAnimationFrame loop,
 * because the analyser was already being read there and reading it twice seemed wasteful. But rAF
 * does not run in a hidden tab. Switch apps on a phone, or move to another tab, mid-sentence, and
 * the level is never sampled again — so the quiet is never noticed, the turn never commits, and the
 * microphone stays open until the 45-second cap. The words are not lost, but nothing happens for
 * three quarters of a minute, which reads as broken.
 *
 * The meter is a visual nicety and belongs on rAF. Deciding that somebody has stopped speaking is
 * not visual, and belongs on a timer, which keeps firing when hidden — throttled to about a second
 * in the background, which is late but still correct.
 *
 * This was found by a test that could not pass: the browser pane was hidden, so no frames were
 * being composited, so the commit never fired. The environment made the bug reproduce.
 */

import fs from 'node:fs';

const F = 'public/voice.js';
let src = fs.readFileSync(F, 'utf8');

if (src.includes('watchTimer')) { console.log('= already applied'); process.exit(0); }

let lines = src.split('\n');
const at = (needle, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && l.includes(needle));
  if (i < 0) throw new Error('not found: ' + needle);
  return i;
};

/* ── 1. pull the silence logic out of the rAF loop ─────────────────────────── */
{
  const start = at('      /* The analyser is already running for the meter, so it can also tell when the person has');
  let end = start;
  while (!lines[end].includes("else if (now - quietSince > 500) say2(")) end++;
  end += 1;                                   /* the closing brace of the else-if chain */
  while (!lines[end].trim().startsWith('}')) end++;
  lines.splice(start, end - start + 1);
  console.log('  removed the silence check from the animation frame loop');
}

/* ── 2. put it on a timer that runs whether or not the page is painting ─────── */
{
  const i = at('    function say2(msg) {');
  lines.splice(i, 0,
    '    /* Whether the person has stopped speaking is not a visual question, so it does not belong',
    '       on requestAnimationFrame — that stops in a hidden tab, which would leave the microphone',
    '       open and the turn uncommitted until the cap. A timer keeps firing when hidden (throttled',
    '       to about a second, which is late but still correct). */',
    '    function watch() {',
    '      if (!analyser || !open) return;',
    '      const data = new Uint8Array(analyser.frequencyBinCount);',
    '      analyser.getByteFrequencyData(data);',
    '      /* Peak, not mean: a mean across every bin is dragged down by the empty high end and',
    '         reads as silence during ordinary speech. */',
    '      let peak = 0;',
    '      for (let k = 0; k < data.length; k++) if (data[k] > peak) peak = data[k];',
    '      const level = peak / 255;',
    '',
    '      if (level > SPEECH_LEVEL) {',
    '        heardSpeech = true;',
    '        quietSince = 0;',
    '        say2(\'Listening…\');',
    '        return;',
    '      }',
    '      /* Quiet only counts once something has been said. Otherwise a quiet room would submit an',
    '         empty turn before anybody spoke. */',
    '      if (!heardSpeech) return;',
    '      const now = Date.now();',
    '      if (!quietSince) { quietSince = now; return; }',
    '      if (now - quietSince > SILENCE_MS) { commitLive(); return; }',
    '      if (now - quietSince > 500) say2(\'Sending in a moment — keep talking to continue.\');',
    '    }',
    '');
}

/* ── 3. start and stop the timer with the turn ─────────────────────────────── */
{
  const i = at('    let heardSpeech = false, quietSince = 0, autoTimer = 0, capTimer = 0;');
  lines[i] = '    let heardSpeech = false, quietSince = 0, autoTimer = 0, capTimer = 0, watchTimer = 0;';
}
{
  const i = at('      capTimer = setTimeout(() => { if (open) commitLive(); }, MAX_TURN_MS);');
  lines.splice(i + 1, 0,
    '      clearInterval(watchTimer);',
    '      watchTimer = setInterval(watch, 120);');
}
{
  const i = at('      clearTimeout(capTimer); capTimer = 0;');
  lines.splice(i + 1, 0,
    '      clearInterval(watchTimer); watchTimer = 0;');
}

fs.writeFileSync(F, lines.join('\n'));
console.log('voice.js — silence is watched on a timer, the meter stays on the frame loop');
