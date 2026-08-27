/* Real photographs, in the two places that were holding coloured rectangles.
 *
 * The hero had two placeholder panels reading "Photo evidence: road damage before repair" — a claim
 * with nothing behind it, on a site whose whole argument is that a closed file is not a fixed road.
 * A before-and-after pair IS the argument. It was the one thing on the page that had to be a
 * photograph and was not.
 *
 * Now it is four cases, each with its own before and after, sliding through on a loop. Four is the
 * right number: one pair reads as an anecdote, four reads as a pattern.
 *
 * The slider:
 *   · 2s on each case, 600ms to move — a slide, not a cut, because a cut between photographs of the
 *     same road looks like a rendering fault.
 *   · transform, not left/opacity, so it runs on the compositor and does not stutter on a phone.
 *   · pauses on hover and on keyboard focus. A photo pair carries a date and a household count;
 *     something that moves while you are reading it is hostile.
 *   · honours prefers-reduced-motion by not moving at all.
 *   · the tab is checked before advancing, so a backgrounded page is not animating for nobody.
 *
 * The case cards below get the same photographs — the BEFORE image, because the card's own text is
 * the story of getting it fixed, and the plate stays over it as the case number.
 *
 * Images: 22.7 MB of PNG became 1.2 MB of WebP at 1100px. The page has to open on a slow
 * connection, and eight full-size PNGs would have made that impossible.
 */

import fs from 'node:fs';

const F = 'public/index.html';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('data-case-slider')) { console.log('= already applied'); process.exit(0); }

/* case → images, and the words that go with each pair */
const CASES = [
  { key: 'road', code: 'EA–2026–04412',
    what: 'Panchayat road, Rajnagar Ward 4',
    before: 'Reported 12 March 2026', after: 'Confirmed by 41 households · 2 April 2026',
    beforeAlt: 'A broken village road with deep potholes, before repair',
    afterAlt: 'The same stretch of road, resurfaced' },
  { key: 'transformer', code: 'EA–2026–04871',
    what: 'Burnt-out transformer, Kanjhawala feeder',
    before: 'Reported 2 May 2026', after: 'Confirmed by 63 households · 14 May 2026',
    beforeAlt: 'A burnt-out distribution transformer', afterAlt: 'A replaced transformer, working' },
  { key: 'light', code: 'EA–2026–05230',
    what: 'Street lights out, NH-44 km 118 to 121',
    before: 'Reported 4 April 2026', after: 'Confirmed by 128 road users · 9 June 2026',
    beforeAlt: 'An unlit highway stretch at night', afterAlt: 'The same stretch with the lights working' },
  { key: 'aganbadi', code: 'EA–2026–05604',
    what: 'Anganwadi kendra roof, Barkheda village',
    before: 'Reported 11 June 2026', after: 'Confirmed by 32 families · 28 July 2026',
    beforeAlt: 'A collapsed anganwadi roof', afterAlt: 'The rebuilt anganwadi roof' },
];

/* ── 1. the hero becomes a slider ──────────────────────────────────────────── */
const slide = (c) => `<div class="ba-slide" role="group" aria-label="${c.what}">`
  + `<figure class="evidence before-evidence">`
  + `<figcaption><span>Before</span><b>${c.before}</b></figcaption>`
  + `<img src="/img/cases/${c.key}-before.webp" alt="${c.beforeAlt}" width="1100" height="760" loading="lazy" decoding="async" />`
  + `</figure>`
  + `<figure class="evidence after-evidence">`
  + `<figcaption><span>After</span><b>${c.after}</b></figcaption>`
  + `<img src="/img/cases/${c.key}-after.webp" alt="${c.afterAlt}" width="1100" height="760" loading="lazy" decoding="async" />`
  + `</figure>`
  + `<p class="ba-tag"><b>${c.what}</b><span>Case ${c.code} · fixed, and confirmed by the people who reported it</span></p>`
  + `</div>`;

const OLD_HERO = `          <div class="before-after" aria-label="A grievance case before and after repair">
            <figure class="evidence before-evidence"><figcaption><span>Before</span><b>Reported 12 March 2026</b></figcaption><div class="evidence-empty"><i>⌖</i><p>Photo evidence: road damage before repair</p></div></figure>
            <figure class="evidence after-evidence"><figcaption><span>After</span><b>Confirmed by 41 households · 2 April 2026</b></figcaption><div class="evidence-empty"><i>✓</i><p>Photo evidence: repair confirmed by residents</p></div></figure>
          </div>`;

const NEW_HERO = `          <div class="before-after" data-case-slider aria-label="Four grievances, before and after they were fixed" aria-roledescription="carousel">
            <div class="ba-viewport"><div class="ba-rail" id="baRail">${CASES.map(slide).join('')}</div></div>
            <div class="ba-dots" id="baDots" role="tablist" aria-label="Choose a case"></div>
          </div>`;

if (!s.includes(OLD_HERO)) {
  /* CRLF or a stray edit — try line-based */
  const lines = s.split(/\r?\n/);
  const i = lines.findIndex((l) => l.includes('class="before-after" aria-label='));
  if (i < 0) { console.log('! hero block not found'); process.exit(1); }
  let j = i;
  while (!lines[j].includes('</div>')) j++;
  lines.splice(i, j - i + 1, ...NEW_HERO.split('\n'));
  s = lines.join('\n');
  console.log('  hero replaced (line-based)');
} else {
  s = s.split(OLD_HERO).join(NEW_HERO);
  console.log('  hero replaced');
}

/* ── 2. the case cards get their own before photograph ─────────────────────── */
{
  let n = 0;
  for (const c of CASES) {
    const before = `<div class="case-image"><div class="plate"><b>CASE ${c.code}</b>`;
    if (!s.includes(before)) { console.log('    ! no card for ' + c.code); continue; }
    s = s.split(before).join(
      `<div class="case-image has-photo">`
      + `<img class="case-photo" src="/img/cases/${c.key}-before.webp" alt="${c.beforeAlt}" width="1100" height="760" loading="lazy" decoding="async" />`
      + `<div class="plate"><b>CASE ${c.code}</b>`);
    n++;
  }
  console.log('  ' + n + ' case cards given their before photograph');
}

/* ── 3. styles ─────────────────────────────────────────────────────────────── */
const CSS = `
      /* ── before and after, on a loop ──────────────────────────────────────────
         Four cases rather than one: a single pair reads as an anecdote, four reads as a pattern.
         The rail moves with transform so it runs on the compositor; left/opacity would stutter on
         a phone. Nothing here animates when the reader has asked for less motion. */
      .before-after { position: relative; display: block; }
      .ba-viewport { overflow: hidden; }
      .ba-rail { display: flex; will-change: transform; transition: transform .6s cubic-bezier(.22,.61,.36,1); }
      .ba-slide { flex: 0 0 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-content: start; }
      .ba-slide .ba-tag { grid-column: 1 / -1; margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; }
      .ba-tag b { font: 800 13px Mukta, sans-serif; color: #241a14; }
      .ba-tag span { font-size: 11.5px; color: #7a6455; }
      .evidence img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .evidence::before { display: none; }
      .after-evidence figcaption span { color: #b9e0c4; }
      .ba-dots { display: flex; gap: 7px; justify-content: center; margin-top: 12px; }
      .ba-dots button { width: 26px; height: 4px; padding: 0; border: 0; border-radius: 2px; background: #d8c9b4; cursor: pointer; transition: background .25s ease; }
      .ba-dots button[aria-selected="true"] { background: #8c2416; }
      @media (max-width: 800px) {
        .ba-slide { grid-template-columns: 1fr; gap: 10px; }
      }
      @media (prefers-reduced-motion: reduce) { .ba-rail { transition: none; } }

      /* the case cards: the before photograph, with the plate over it */
      .case-image.has-photo { position: relative; }
      .case-image .case-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .case-image.has-photo .plate { background: linear-gradient(to top, #241a14f2 0%, #241a1499 45%, #241a1400 100%); border: 0; color: #fff; inset: auto 0 0 0; padding: 26px 28px 24px; }
      .case-image.has-photo .plate b { color: #fff; }
      .case-image.has-photo .plate span { color: #e7d9c6; }
      .case-image.has-photo > p { position: absolute; left: 28px; bottom: 8px; margin: 0; color: #e7d9c6; font-size: 11px; z-index: 1; }
`;

s = s.replace('</style>', () => CSS + '    </style>');

/* ── 4. the driver ─────────────────────────────────────────────────────────── */
const JS = `
<script>
/* The before/after loop.
   2s on a case, 600ms to move. It pauses on hover and on focus, because each pair carries a date
   and a household count and something that slides away mid-sentence is hostile. It stops entirely
   when the reader prefers reduced motion, and does not advance while the tab is hidden. */
(function () {
  var rail = document.getElementById('baRail');
  var dots = document.getElementById('baDots');
  if (!rail || !dots) return;

  var slides = rail.children.length;
  if (!slides) return;

  var at = 0, timer = 0, held = false;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (var i = 0; i < slides; i++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', 'Case ' + (i + 1) + ' of ' + slides);
    b.addEventListener('click', (function (n) { return function () { show(n); hold(); }; })(i));
    dots.appendChild(b);
  }

  function show(n) {
    at = (n + slides) % slides;
    rail.style.transform = 'translate3d(' + (-100 * at) + '%,0,0)';
    for (var k = 0; k < dots.children.length; k++) {
      dots.children[k].setAttribute('aria-selected', k === at ? 'true' : 'false');
    }
  }

  function tick() {
    if (held || document.hidden) return;
    show(at + 1);
  }

  function run() { clearInterval(timer); if (!still) timer = setInterval(tick, 2000); }
  function hold() { held = true; }
  function release() { held = false; }

  var box = rail.closest('[data-case-slider]');
  box.addEventListener('mouseenter', hold);
  box.addEventListener('mouseleave', release);
  box.addEventListener('focusin', hold);
  box.addEventListener('focusout', release);

  show(0);
  run();
})();
</script>
`;

s = s.replace('</body>', () => JS + '</body>');

fs.writeFileSync(F, s);
console.log('  slider driver and styles added');
