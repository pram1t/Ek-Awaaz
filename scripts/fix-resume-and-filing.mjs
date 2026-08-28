/* A reloaded conversation filed a case that never reached the server.
 *
 * The draft stored only `domain.key`, and the resume looked that key up in the CLIENT-side domain
 * table. But after the server has classified, `domain.key` holds a server key — "infra.water" —
 * while the client table is keyed short: "water". The lookup missed, `domain` fell back to the
 * default "other", and `apiDomain` — which only ever exists on the object the server returned — was
 * gone with it.
 *
 * fileCase() then hits `if (window.EAAPI && domain.apiDomain && session.phone)`, finds no
 * apiDomain, and takes the offline branch: a case recorded on the device that the server never
 * hears about. It gets a case number, it says "filed", and it is nowhere. That is the
 * "some cases are not getting registered in the dashboard" report, and it is silent by design —
 * the offline path exists for a genuinely unreachable server, and it cannot tell the difference.
 *
 * Two fixes, because either alone leaves the hole open:
 *   1. The draft carries the whole resolved domain, so a reload resumes with everything the server
 *      told us rather than a guess from a table that does not share its keys.
 *   2. Filing re-classifies when apiDomain is missing. Going local is then a real network failure,
 *      not a bookkeeping accident — and if it does happen the citizen is told, rather than being
 *      handed a case number for a case that exists only in their browser.
 */

import fs from 'node:fs';

const F = 'public/report.html';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('draft.domainState')) { console.log('= already applied'); process.exit(0); }

const swap = (from, to, label) => {
  if (!s.includes(from)) { console.log('  ! anchor miss: ' + label); process.exit(1); }
  s = s.split(from).join(to);
  console.log('  ~ ' + label);
};

/* ── 1. the draft carries the resolved domain, not just its key ────────────── */
swap(
  "  EA.patch({ draft: { issue: issue, step: step, answers: answers, domain: domain.key, convo: convo, afterTalk: afterTalk, at: Date.now() } });",
  "  /* The whole resolved domain, not just its key. The key alone was not enough to rebuild this:\n"
  + "     after the server classifies, domain.key holds a server key like \"infra.water\", and the\n"
  + "     client table that the resume looked it up in is keyed \"water\". The lookup missed, the\n"
  + "     object fell back to \"other\", and apiDomain went with it — so the case filed offline. */\n"
  + "  EA.patch({ draft: { issue: issue, step: step, answers: answers, domain: domain.key,\n"
  + "    domainState: domain, convo: convo, afterTalk: afterTalk, at: Date.now() } });",
  'the draft stores the whole domain'
);

/* ── 2. the resume uses it ─────────────────────────────────────────────────── */
swap(
  "  if (draft.domain) domain = domains.find((d) => d.key === draft.domain) || domain;",
  "  /* Prefer what the server gave us last time. The table lookup is only a fallback for a draft\n"
  + "     saved before this fix existed. */\n"
  + "  if (draft.domainState && typeof draft.domainState === 'object') domain = draft.domainState;\n"
  + "  else if (draft.domain) domain = domains.find((d) => d.key === draft.domain) || domain;\n"
  + "  isPublic = !!domain.isPublic;",
  'the resume restores it'
);

/* ── 3. filing never silently goes local ───────────────────────────────────── */
swap(
  "  if (window.EAAPI && domain.apiDomain && session.phone) {",
  "  /* A case with no apiDomain has never been classified by the server — which now only happens\n"
  + "     when something went wrong, not as a matter of course. Classify it before filing rather than\n"
  + "     quietly recording it on the device: an offline case gets a case number and appears in no\n"
  + "     dashboard, and the citizen has no way to tell. */\n"
  + "  if (window.EAAPI && !domain.apiDomain && (answers.grievance || issue)) {\n"
  + "    try { await classifyRemote(answers.grievance || issue); } catch (e) { /* handled below */ }\n"
  + "  }\n"
  + "\n"
  + "  if (window.EAAPI && domain.apiDomain && session.phone) {",
  'filing re-classifies rather than falling back silently'
);

/* ── 4. and says so when it really is offline ──────────────────────────────── */
swap(
  "  if (!record) record = Object.assign(EA.file(local), { offline: true });",
  "  if (!record) {\n"
  + "    record = Object.assign(EA.file(local), { offline: true });\n"
  + "    /* Say it. A case number for a case the server never received is the one thing here that\n"
  + "       would be worse than an error message. */\n"
  + "    bubble('them', '<p class=\"aside\">I could not reach the service, so this is saved on your phone '\n"
  + "      + 'only and is not with any office yet. Open it again when you have a signal and I will send it.</p>');\n"
  + "  }",
  'an offline case says it is offline'
);

fs.writeFileSync(F, s);
console.log('done');
