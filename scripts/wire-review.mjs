/* Wire the review screen to the summary, and give evidence the right control.
 *
 * saidRows() built the screen from steps[]: one row per question asked, labelled with the
 * question truncated to 22 characters. That is the code path that produced
 * "KAB AAPNE BANK KO PEHL" as a field name, and it is deleted rather than patched — a label
 * must never again be derived from what was asked.
 *
 * Evidence had an Edit button that opened a text box, so the only way to "edit" an attachment
 * was to type a description of one. It gets a file picker, which is what it always should have
 * been: the same hidden input the composer clip already uses.
 */

import fs from 'node:fs';

const F = 'public/report.html';
let h = fs.readFileSync(F, 'utf8');
let n = 0;
const swap = (a, b, marker) => {
  if (marker && h.includes(marker)) { console.log('  = already: ' + marker.slice(0, 36)); return; }
  if (!h.includes(a)) { console.log('  ! miss: ' + a.slice(0, 58)); return; }
  h = h.replace(a, () => b); n++;
};

/* ── 1 · saidRows is replaced by the summary ──────────────────────────────── */
const oldRows = `function saidRows() {
  const rows = [['grievance', 'What you reported', answers.grievance || issue || '—']];
  steps.forEach((s) => { if (/^ask/.test(s.key)) rows.push([s.key, s.label, answers[s.key] || '—']); });
  rows.push(['location', 'Location', answers.location || '—']);
  rows.push(['evidence', 'Evidence', answers.evidence || (files.length ? files.length + ' files' : 'None attached')]);
  return rows;
}`;

const newRows = `/* Fields the citizen reads back. Filled by summariseIntake from the whole exchange; the
   labels come from that summary or from this fixed list, and never from the text of a question.
   The old version truncated whatever had been asked into a label, which is how a Hinglish
   question became a field name and a citizen's aside became case content. */
let summaryFields = null;

async function loadSummary() {
  if (!window.EAAPI) return;
  const asked = steps.filter((s) => /^ask/.test(s.key)).map((s) => ({ q: s.q, a: answers[s.key] || '' }))
    .filter((x) => x.a);
  const res = await window.EAAPI.summarise({
    grievance: answers.grievance || issue,
    domain: domain.key, office: domain.office, answers: asked
  });
  if (res && Array.isArray(res.fields) && res.fields.length) summaryFields = res.fields;
}

function saidRows() {
  const rows = [];
  if (summaryFields) {
    summaryFields.forEach((f) => rows.push([f.key, f.label, f.value, f.kind || 'text']));
  } else {
    /* No model. Fixed labels — the point is that none of them is built from a question. */
    rows.push(['grievance', 'What happened', answers.grievance || issue || '—', 'text']);
    const said = steps.filter((s) => /^ask/.test(s.key)).map((s) => answers[s.key]).filter(Boolean);
    if (said.length) rows.push(['detail', 'What you added', said.join(' · '), 'text']);
  }
  rows.push(['location', 'Where', answers.location || '—', 'place']);
  rows.push(['evidence', 'Attached',
    files.length ? files.map((f) => f.name).join(', ') : 'Nothing attached', 'file']);
  return rows;
}`;

swap(oldRows, newRows, 'let summaryFields = null;');

/* ── 2 · the rows carry their kind, and evidence gets a file button ───────── */
swap(`    + saidRows().map(([key, label, value]) => '<div><div><dt>' + esc(label) + '</dt><dd data-value="' + key + '">' + esc(value) + '</dd></div><button class="edit" type="button" data-edit="' + key + '">Edit</button></div>').join('')`,
`    + saidRows().map(([key, label, value, kind]) => '<div><div><dt>' + esc(label) + '</dt><dd data-value="' + key + '">' + esc(value) + '</dd></div>'
        + (kind === 'file'
            ? '<button class="edit" type="button" data-attach="1">Attach a file</button>'
            : '<button class="edit" type="button" data-edit="' + key + '">Edit</button>')
        + '</div>').join('')`,
   'data-attach="1"');

/* ── 3 · fetch the summary before drawing the screen ─────────────────────── */
swap(`  fetchRoute().finally(() => {`,
     `  Promise.all([fetchRoute(), loadSummary()]).finally(() => {`,
     'loadSummary()]).finally');

/* ── 4 · the attach button opens the file picker the composer already has ── */
if (!h.includes("data-attach")) console.log('  ! attach button not placed');
if (!h.includes('attachFromReview')) {
  const anchor = 'function editFromMessage(value) {';
  if (h.includes(anchor)) {
    h = h.replace(anchor, `/* The review screen's attachment row opens the same hidden file input the composer clip uses.
   It previously offered an Edit button that opened a text box, so the only way to change an
   attachment was to type a sentence describing one. */
function attachFromReview() {
  const input = document.querySelector('#fileInput');
  if (!input) return;
  const once = () => { input.removeEventListener('change', once); renderRoute(); };
  input.addEventListener('change', once);
  input.click();
}

${anchor}`);
    n++;
  } else console.log('  ! editFromMessage anchor missing');
}

/* and the click handler for it */
if (!h.includes("dataset.attach")) {
  const hookAnchor = h.match(/routeTurn\.querySelectorAll\('\[data-edit\]'\)[^\n]*\n/);
  if (hookAnchor) {
    h = h.replace(hookAnchor[0], hookAnchor[0]
      + "  routeTurn.querySelectorAll('[data-attach]').forEach((b) => b.addEventListener('click', attachFromReview));\n");
    n++;
  } else console.log('  ! could not find the data-edit hook to sit beside');
}

fs.writeFileSync(F, h);
console.log(`report.html — ${n} edits`);
