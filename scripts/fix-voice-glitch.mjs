/* Two defects in the speak-instead panel.

   1. "…Listening" — the ellipsis lands on the wrong side. `.ea-voice-text` carries
      direction:rtl so that a transcript longer than the bar ellipsises at the START and the
      newest words stay visible. That is right for a transcript and wrong for everything else:
      applied to short hint text it simply flips the punctuation. It is now scoped to the
      transcript state only.

   2. The panel is absolutely positioned over a row whose other children are still painted:
      on the homepage that row holds a solid blue "Start with Didi" button, on the report page
      a focused textarea. During the clip-path reveal the seam runs across those siblings, so
      a strip of blue shows through the edge of the animation. The panel's white background
      cannot cover them because the clip has not reached them yet.

      The fix is not more z-index. While the panel is open the row's other children are hidden
      outright, so the reveal runs over nothing but the panel's own background. Hidden with
      visibility, not display, so the row keeps its width and the panel does not resize
      mid-animation. */

import fs from 'node:fs';

const F = 'public/voice.js';
let s = fs.readFileSync(F, 'utf8');
let n = 0;
const swap = (a, b) => { if (!s.includes(a)) { console.log('  ! miss: ' + a.slice(0, 60)); return; } s = s.replace(a, b); n++; };

/* ---- 1. the ellipsis ---- */

swap(`  .ea-voice-text{flex:1 1 auto;min-width:0;font:500 13px/1.35 Manrope,Arial,sans-serif;color:#24313f;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:rtl;text-align:left}`,
`  .ea-voice-text{flex:1 1 auto;min-width:0;font:500 13px/1.35 Manrope,Arial,sans-serif;color:#24313f;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
  /* rtl only once there is a transcript, so a long one clips at the start and the newest
     words stay in view. On hint text it would just move the ellipsis to the wrong side. */
  .ea-voice-text.live{direction:rtl}`);

swap(`  .ea-voice-text.hint{color:#8a99a8;font-weight:400;white-space:normal}`,
     `  .ea-voice-text.hint{color:#8a99a8;font-weight:400;white-space:normal;direction:ltr}`);

/* ---- 2. nothing underneath while the reveal runs ---- */

swap(`  .ea-voice-host{--h:44px;position:relative}`,
`  .ea-voice-host{--h:44px;position:relative}
  /* Everything in the row except the button and the panel steps aside while the panel is
     open. Without this the clip-path seam sweeps across whatever the row already holds — a
     blue primary button, a focused textarea — and that shows as a coloured strip at the
     leading edge of the animation. */
  .ea-voice-host.ea-open > *:not(.ea-voice-btn):not(.ea-voice-panel){visibility:hidden}`);

/* the panel paints on its own layer so the seam has nothing to composite against */
swap(`    clip-path:inset(0 100% 0 0 round calc(var(--h)/2));opacity:0;pointer-events:none;`,
     `    clip-path:inset(0 100% 0 0 round calc(var(--h)/2));opacity:0;pointer-events:none;
    isolation:isolate;will-change:clip-path,opacity;`);

/* ---- 3. drive the .live class from paint()/say() ---- */

swap(`      const has = (finalText + interimText).trim();
      text.classList.toggle('hint', !has);`,
`      const has = (finalText + interimText).trim();
      text.classList.toggle('hint', !has);
      text.classList.toggle('live', !!has);`);

swap(`    function say(msg) { finalText = ''; interimText = ''; text.classList.add('hint'); text.textContent = msg; use.classList.remove('on'); }`,
     `    function say(msg) { finalText = ''; interimText = ''; text.classList.add('hint'); text.classList.remove('live'); text.textContent = msg; use.classList.remove('on'); }`);

/* the very first "Listening…" is written straight to textContent, not through paint() */
swap(`      say(SR ? 'Listening…' : 'Recording…');`,
     `      say(SR ? 'Listening…' : 'Recording…');   /* say() clears .live, so this reads left to right */`);

fs.writeFileSync(F, s);
console.log(`voice.js  ${n} edits`);
