/* Two faults on the handover to the review screen, and they share a fix.
 *
 * The bubble said "That is enough. Here is where it goes and what you hold — nothing has been sent
 * yet." The panel immediately beneath it says "ROUTE FOUND · NOTHING SENT YET" and "Your case, and
 * where it goes". That is the same sentence twice, once as speech and once as a heading, and the
 * heading says it better. So the bubble goes.
 *
 * And everything there was English, inside a conversation held in Hindi. The panel is the moment
 * the whole product turns on — it is where a citizen reads back what we understood before anything
 * is sent — so it is the worst place on the site to switch languages on somebody.
 *
 * Six strings, translated through the same cached /say endpoint the questions use. Not the case
 * fields: those are the citizen's own words and are already in their language.
 */

import fs from 'node:fs';

const F = 'public/report.html';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('localiseRoutePanel')) { console.log('= already applied'); process.exit(0); }

/* ── 1. the duplicated bubble goes ─────────────────────────────────────────── */
{
  const from = "    bubble('them', '<p>That is enough. Here is where it goes and what you hold — nothing has been sent yet.</p>');\n";
  const to = "    /* No bubble here. The panel's own heading says \"nothing sent yet\" and \"your case, and where\n"
    + "       it goes\" — saying it again in a speech bubble directly above was the same sentence twice. */\n";
  if (!s.includes(from)) { console.log('  ! bubble anchor miss'); process.exit(1); }
  s = s.split(from).join(to);
  console.log('  ~ the duplicated bubble is gone');
}

/* ── 2. the panel header speaks the citizen's language ─────────────────────── */
{
  const anchor = 'function renderRoute() {';
  if (!s.includes(anchor)) { console.log('  ! renderRoute not found'); process.exit(1); }

  const helper = `/* The review panel is where a citizen reads back what we understood before anything is sent. It is
   the worst place on the site to switch languages on somebody, and it was entirely English inside a
   Hindi conversation. Translated after paint so the panel never waits on a network call, and cached
   by /say so it costs one call per language for the life of the instance.

   The case fields are deliberately not translated: those are the citizen's own words. */
async function localiseRoutePanel(root) {
  const lang = spokenLang();
  if (!lang || /^en/i.test(lang) || !window.EAAPI || !EAAPI.say || !root) return;

  const nodes = [...root.querySelectorAll('[data-t]')];
  if (!nodes.length) return;
  const originals = nodes.map((n) => n.textContent.trim());

  const out = await EAAPI.say(originals, lang);
  if (!out || out.error || !Array.isArray(out.lines) || out.lines.length !== originals.length) return;
  nodes.forEach((n, i) => { if (out.lines[i]) n.textContent = out.lines[i]; });
}

function renderRoute() {`;

  s = s.replace(anchor, () => helper);
  console.log('  ~ localiseRoutePanel() added');
}

/* ── 3. mark the chrome that should be translated ──────────────────────────── */
{
  const marks = [
    ['<b>Route found · nothing sent yet</b>', '<b data-t>Route found · nothing sent yet</b>'],
    ['<h2>Your case, and where it goes</h2>', '<h2 data-t>Your case, and where it goes</h2>'],
    ['<p>Read it back. Every line can be corrected before you send.</p>',
     '<p data-t>Read it back. Every line can be corrected before you send.</p>'],
    ["<p class=\"eyebrow\">What you said</p>", "<p class=\"eyebrow\" data-t>What you said</p>"],
    ["<p class=\"eyebrow\">Where it goes</p>", "<p class=\"eyebrow\" data-t>Where it goes</p>"],
    ["<p class=\"eyebrow\">Match found</p>", "<p class=\"eyebrow\" data-t>Match found</p>"],
  ];
  let n = 0;
  for (const [from, to] of marks) {
    if (!s.includes(from)) continue;
    s = s.split(from).join(to);
    n++;
  }
  console.log('  ~ ' + n + ' panel headings marked for translation');
}

/* ── 4. run it once the panel is on screen ─────────────────────────────────── */
{
  const from = "  routeTurn.innerHTML = '<span class=\"av\"><img src=\"/img/smiti-didi.jpg\" alt=\"\" width=\"34\" height=\"34\" decoding=\"async\" /></span><div class=\"bubble wide\">' + html + '</div>';";
  const to = from + "\n  /* After paint: the panel appears immediately in English and settles into their language a\n"
    + "     moment later, rather than making them wait on a network call to see their own case. */\n"
    + "  localiseRoutePanel(routeTurn);";
  if (!s.includes(from)) { console.log('  ! routeTurn paint anchor miss'); process.exit(1); }
  s = s.split(from).join(to);
  console.log('  ~ the panel is translated after paint');
}

/* ── 5. the other hardcoded lines in the conversation ──────────────────────── */
{
  const lines = [
    ["bubble('them', '<p>Changed. Read it once more before you send it.</p>');",
     "sayLocalised('Changed. Read it once more before you send it.');"],
    ["bubble('them', '<p>Send me the new wording for that line.</p>');",
     "sayLocalised('Send me the new wording for that line.');"],
  ];
  let n = 0;
  for (const [from, to] of lines) {
    if (!s.includes(from)) continue;
    s = s.split(from).join(to);
    n++;
  }

  /* A one-line bubble in the citizen's language, English until the translation lands. */
  const helper = `/* A line of ours, spoken in their language. Painted in English first so nothing waits on a
   network call, then replaced in place when the translation arrives. */
async function sayLocalised(text) {
  const turn = bubble('them', '<p>' + esc(text) + '</p>');
  const lang = spokenLang();
  if (!lang || /^en/i.test(lang) || !window.EAAPI || !EAAPI.say) return turn;
  const out = await EAAPI.say([text], lang);
  if (out && !out.error && Array.isArray(out.lines) && out.lines[0]) {
    const p = turn.querySelector('.bubble p:not(.who)');
    if (p) p.textContent = out.lines[0];
  }
  return turn;
}

function renderRoute() {`;
  s = s.replace('function renderRoute() {', () => helper);
  console.log('  ~ ' + n + ' edit-flow lines localised, sayLocalised() added');
}

fs.writeFileSync(F, s);
console.log('done');
