/* Put Smiti in the conversation she is supposed to be having.
 *
 * Three things were wrong on the page a judge actually spends their time in.
 *
 *  1. The avatar beside every reply was the old concentric-ring mark — the bullseye replaced
 *     everywhere else because it reads as a shooting target. It survived here because it is
 *     built inside a template string in a script, out of reach of a markup pass.
 *
 *  2. The speaker was "Ek Awaaz". The homepage introduces Smiti Didi by name, with a face and
 *     a described manner, and then the conversation itself is with an institution. The entire
 *     argument for a persona is that a citizen is talking to someone rather than filling in a
 *     form, and signing her replies with the platform name throws that away at the moment it
 *     matters most.
 *
 *  3. Half the screen was empty cream. The thread sits at the top, the composer is pinned to
 *     the bottom, and five hundred pixels of nothing in between reads as a page that failed to
 *     load rather than a conversation waiting for an answer.
 *
 * The portrait fallback is a delegated listener rather than an inline onerror. The first
 * attempt used one, and its quotes collapsed the surrounding template string and broke the
 * whole script — an inline handler inside generated markup has to survive two levels of
 * quoting, which is a bad trade for four lines of convenience.
 */

import fs from 'node:fs';

const F = 'public/report.html';
let h = fs.readFileSync(F, 'utf8');
let n = 0;
const swap = (a, b, marker) => {
  if (marker && h.includes(marker)) { console.log('  = already: ' + marker.slice(0, 34)); return; }
  if (!h.includes(a)) { console.log('  ! miss: ' + a.slice(0, 58)); return; }
  h = h.replace(a, () => b); n++;
};

/* no quotes of any kind inside, so it survives being embedded in a JS string */
const AV = '<span class="av"><img src="/img/smiti-didi.jpg" alt="" width="34" height="34" decoding="async" /></span>';

/* ── 1 + 2 · her face and her name ────────────────────────────────────────── */
swap(`'<span class="av" aria-hidden="true"><i></i><i></i><i></i></span><div class="bubble"><p class="who">Ek Awaaz</p>'`,
     `'${AV}<div class="bubble"><p class="who">Smiti Didi</p>'`,
     'class="who">Smiti Didi');

swap(`turn.innerHTML = '<span class="av" aria-hidden="true"><i></i><i></i><i></i></span><div class="bubble wide">' + html + '</div>';`,
     `turn.innerHTML = '${AV}<div class="bubble wide">' + html + '</div>';`,
     `'${AV}<div class="bubble wide">`);

/* any avatar written directly into the markup */
const inline = '<span class="av" aria-hidden="true"><i></i><i></i><i></i></span>';
while (h.includes(inline)) { h = h.replace(inline, () => AV); n++; }

/* ── 3 · the avatar becomes a portrait well ───────────────────────────────── */
swap('.av{width:30px;height:30px;flex:0 0 30px;border-radius:50%;border:1.5px solid var(--blue);position:relative;display:grid;place-items:center;margin-top:2px}',
`.av{width:34px;height:34px;flex:0 0 34px;border-radius:50%;overflow:hidden;position:relative;
  display:grid;place-items:center;margin-top:2px;background:#f1e8d9;border:1.5px solid #e0c4bb}
.av img{width:100%;height:100%;object-fit:cover;object-position:50% 16%;display:block}
/* a missing portrait leaves her initial, never a broken image */
.av.no-photo::after{content:"स";font:400 17px "Tiro Devanagari Hindi",serif;color:#8c2416}`,
     '.av img{width:100%');

/* ── the empty half of the screen ─────────────────────────────────────────── */
swap('<div class="thread-wrap" id="threadWrap">',
     '<div class="thread-mandala" aria-hidden="true"></div>\n  <div class="thread-wrap" id="threadWrap">',
     'thread-mandala');

/* ── the delegated portrait fallback ──────────────────────────────────────── */
if (!h.includes('portrait fallback')) {
  const tail = h.lastIndexOf('</body>');
  h = h.slice(0, tail)
    + '<script>\n'
    + '/* portrait fallback, delegated. A broken image in a chat avatar should degrade to her\n'
    + '   initial, and doing it here rather than with an inline onerror keeps the generated\n'
    + '   markup free of quotes that would have to survive two levels of escaping. */\n'
    + 'document.addEventListener("error", function (e) {\n'
    + '  var img = e.target;\n'
    + '  if (!img || img.tagName !== "IMG" || !img.closest(".av")) return;\n'
    + '  img.closest(".av").classList.add("no-photo");\n'
    + '  img.remove();\n'
    + '}, true);\n'
    + '</script>\n'
    + h.slice(tail);
  n++;
}

fs.writeFileSync(F, h);
console.log('report.html — ' + n + ' edits');

/* ── styling for the empty space ──────────────────────────────────────────── */
if (!fs.readFileSync('public/structure.css', 'utf8').includes('thread-mandala')) {
  fs.appendFileSync('public/structure.css', `

/* ── the report thread ───────────────────────────────────────────────────────
   The conversation opens with two lines and the composer is pinned to the bottom, so most of
   the screen is empty at the moment a citizen is deciding whether to trust this. A mandala low
   in that space makes the emptiness look composed rather than unfinished, and it sits far
   enough down that it never competes with the question being asked. */
.thread-mandala{
  position: fixed; z-index: 0; pointer-events: none;
  left: 50%; transform: translateX(-50%);
  bottom: 96px; width: min(54vw, 500px); aspect-ratio: 1;
  background-color: var(--madder); opacity: .05;
  -webkit-mask: url("/img/ornament/mehndi-and-sangeet-595.svg") no-repeat center / contain;
  mask: url("/img/ornament/mehndi-and-sangeet-595.svg") no-repeat center / contain;
}
.thread-wrap, .composer, .head{ position: relative; z-index: 1 }
@media (max-width: 760px){ .thread-mandala{ width: 92vw; bottom: 130px; opacity: .04 } }
`);
  console.log('structure.css — thread mandala added');
}
