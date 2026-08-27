/* Plain English everywhere, driven by the audit rather than by what I happened to look at.
 *
 * The rule that decides most of this: an official title stays, the words around it get simpler.
 * "District Grievance Redressal Officer" is jargon, and it is also the actual name of the actual
 * person — a citizen who walks in asking for "the officer who fixes ration problems" gets sent
 * away, and one who asks for the DGRO does not. So the title is kept and explained, never
 * translated away. The same holds for the First Appellate Authority, the Adjudicating Officer and
 * the State Nodal Officer.
 *
 * Everything else — our own sentences, our own labels, our own errors — gets said the way a person
 * would say it.
 *
 * Reports every anchor that did not match, because a copy pass that silently skips half its edits
 * is worse than no pass at all.
 */

import fs from 'node:fs';

const misses = [];
let done = 0;

function edit(file, pairs, { json = false } = {}) {
  if (!fs.existsSync(file)) { misses.push(file + ' — missing'); return; }
  let s = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [from, to] of pairs) {
    if (from === to) continue;
    if (!s.includes(from)) { misses.push(file + ' :: ' + from.slice(0, 62)); continue; }
    s = s.split(from).join(to);
    n++;
  }
  if (!n) return;
  if (json) JSON.parse(s);                 /* never write a data file we just broke */
  fs.writeFileSync(file, s);
  console.log('  ' + file.padEnd(26) + n + ' rewritten');
  done += n;
}

/* ── the homepage ──────────────────────────────────────────────────────────── */
edit('public/index.html', [
  ['If a statutory appeal, ombudsman, or entitlement provides a stronger path, we show it before you commit.',
   'If there is a stronger route — an appeal set out in law, an ombudsman, or money you are owed — we show it before you send anything.'],

  ['Not always. When a sector has a stronger statutory remedy or ombudsman, we show that path before you file.',
   'Not always. If the law gives you something stronger, or there is an ombudsman for it, we show you that first.'],

  ['Accessible, multilingual, privacy-conscious, and designed for low-bandwidth use.',
   'Works with a screen reader, speaks your language, keeps your details private, and loads on a slow connection.'],

  ['Routing logic, remedy guidance, and case joining are demonstrated in this prototype. Filing into government systems and identity verification are mocked.',
   'Finding the right office, showing you stronger options, and joining a case all really work here. Sending it to the government, and checking who you are, are pretend.'],

  /* Official titles kept; the sentence around them explains what they are. */
  ['The discom’s consumer grievance redressal forum.',
   'Your electricity company’s own complaint forum — the Consumer Grievance Redressal Forum.'],

  ['Your bank’s own grievance redressal officer.',
   'Your bank’s own complaints officer, called the Grievance Redressal Officer.'],

  ['The insurer’s own grievance redressal officer.',
   'Your insurer’s own complaints officer, called the Grievance Redressal Officer.'],

  ['District Supply Officer, or the District Grievance Redressal Officer.',
   'The District Supply Officer, or the officer the food law puts in every district — the District Grievance Redressal Officer.'],

  ['EPFO appellate authority, then the Central PF Commissioner.',
   'Appeal inside EPFO, then the Central PF Commissioner.'],

  ['Appeal to the appellate authority through CPGRAMS.',
   'File an appeal through CPGRAMS — it goes to the officer above the one who handled it.'],

  ['The First Appellate Authority inside the same office.',
   'Ask the same office again in writing. This is called a first appeal, and it has its own deadline.'],

  ['EPFiGMS, then the Regional PF Commissioner.',
   'EPFiGMS first, then the Regional PF Commissioner.'],

  /* the published-record panel */
  ['marked disposed within the month', 'closed by an officer that month'],
  ['still open from that month’s intake', 'still open from that month'],
  ["still open from that month's intake", 'still open from that month'],
  ['lodged with central ministries', 'filed with central ministries'],

  ['A <b>95.8% disposal rate</b> — and that number is the reason this project exists. <b>Disposed means a file was closed, not that a road was repaired.</b> Nothing in the figure records whether the person who complained agrees, and nothing asks them.',
   'That is <b>95.8% closed</b>, and that number is why we built this. <b>Closed means an officer shut the file. It does not mean the road got fixed.</b> Nobody asked the person who complained whether the problem went away.'],

  ['Figures as published in the CPGRAMS monthly report for March 2026. A separate 81,187 shown as pending at month end includes cases carried forward from earlier months, which is why it exceeds this month’s remainder.',
   'These are the government’s own published numbers for March 2026. The report also shows 81,187 still pending at the end of the month — that figure includes older cases carried over, which is why it is larger.'],

  ["Figures as published in the CPGRAMS monthly report for March 2026. A separate 81,187 shown as pending at month end includes cases carried forward from earlier months, which is why it exceeds this month's remainder.",
   'These are the government’s own published numbers for March 2026. The report also shows 81,187 still pending at the end of the month — that figure includes older cases carried over, which is why it is larger.'],

  ['Average time to disposal, central ministries', 'Average time an officer takes to close a case'],
  ['The disposal target the system sets for itself', 'The 21 days the system promises itself'],
  ['Still pending when the month closed — 43% of its own intake', 'Still waiting when the month ended — 43% of that month’s cases'],
  ['In three ministries alone: labour, banking, petroleum', 'From just three ministries: labour, banking, petroleum'],
  ['Stronger options we point you to, each better than a complaint', 'Stronger options we point you to, each better than a plain complaint'],
]);

/* ── my grievances ─────────────────────────────────────────────────────────── */
edit('public/my-cases.html', [
  ['Escalation available', 'Can go higher'],
  ['Bank nodal officer', 'The bank’s senior complaints officer'],
  ['Awaiting your confirmation', 'Waiting for you to confirm'],
]);

/* ── the fallback router in the browser ────────────────────────────────────── */
edit('public/app.js', [
  ['If unresolved, the EPF escalation and appeal route may apply.',
   'If nothing moves, you can take it higher inside EPFO and then appeal.'],
  ['District Grievance Redressal Officer',
   'District Grievance Redressal Officer (the food law puts one in every district)'],
]);

/* ── the routing table ─────────────────────────────────────────────────────── */
edit('data/routing.json', [
  ['Portal-level issues are fixed at tier one; land seeding and eligibility escalate to the state nodal officer.',
   'Simple portal problems are fixed at the first level. Land records and eligibility go up to the senior state officer for the scheme.'],

  ['RERA has an adjudicating officer who can award compensation, with a 60-day clock.',
   'RERA has an officer who can order the builder to pay you, and has to decide within 60 days.'],

  ['Your distribution company answers first, and there is a statutory forum above it.',
   'Your electricity company answers first, and the law puts a forum above it if they do not.'],

  ['Refund delays are handled by CPC, and interest on the delay is your statutory right.',
   'The processing centre handles refund delays, and the law says you get interest on the delay.'],

  ['One report can create two records: a private case for your own entitlement, and a joinable public case about the shop.',
   'One report can make two cases: a private one about what you are owed, and a shared one about the shop that neighbours can join.'],

  ['RailMadad and helpline 139 handle this, and CPGRAMS is genuinely the correct escalation above it. We say so rather than pretending otherwise.',
   'RailMadad and helpline 139 handle this, and CPGRAMS really is the right place above them. We say so instead of pretending we are better.'],

  ['That docket is what an appellate authority will ask for.',
   'That number is the first thing an appeal officer will ask you for.'],

  ['DARPG Office Memorandum, 23 August 2024 — administrative, not statutory',
   'A government instruction of 23 August 2024 — an internal rule, not a law'],

  ["Employees' Provident Funds and Miscellaneous Provisions Act 1952",
   "Employees' Provident Funds Act, 1952"],
], { json: true });

/* ── the remedy ladder ─────────────────────────────────────────────────────── */
edit('data/remedies.json', [
  ['A statutory entitlement, not a request', 'Something the law owes you, not a favour you are asking for'],
  ['Statutory interest on your refund', 'Interest you are owed on a late refund'],
  ['EPF escalation and Ombudsman', 'Taking your PF case higher, up to the Ombudsman'],
  ['Statutory appeal under section 7I; the Ombudsman can direct the office',
   'An appeal the law gives you under section 7I. The Ombudsman can order the office to act'],
  ['State Nodal Officer escalation', 'Goes up to the senior state officer'],
  ['Automatic escalation after 15 working days', 'Goes up on its own after 15 working days'],
  ['Compensation, interest and penalty; then the Appellate Tribunal',
   'They can be made to pay you compensation, interest and a penalty. Above that sits the Appellate Tribunal'],
  ['Bihar: quasi-judicial powers, 60 working days. Rajasthan: ₹250 a day, capped ₹5,000. Karnataka: ₹20 a day to you, capped ₹500',
   'Bihar: the officer has court-like powers and 60 working days. Rajasthan: ₹250 for every day late, up to ₹5,000. Karnataka: ₹20 a day paid to you, up to ₹500'],
  ['State right-to-service or grievance-redressal Act',
   'Your state’s right-to-service law, where it has one'],
  ['Regional PF Commissioner, then Central PF Commissioner, then the EPF Ombudsman for your region',
   'The Regional PF Commissioner first, then the Central PF Commissioner, then the EPF Ombudsman for your area'],
  ['Can enquire and pass awards. Delay compensation for wages past 15 days. Unemployment allowance at 25% of minimum wage for the first 30 days, half-wage after',
   'Can investigate and order payment. If wages are more than 15 days late you are owed compensation. If no work was given, you are owed 25% of the minimum wage for the first 30 days and half the wage after that'],
], { json: true });

/* ── the officer's own words stay as they are ──────────────────────────────── */
/* The "vide work order" line in api.js is a seeded Action Taken Report — it is officialese ON
   PURPOSE, because the product's job is to translate it. Simplifying it would delete the thing
   Smiti is demonstrating. Left alone deliberately. */

/* ── server messages people actually read ─────────────────────────────────── */
edit('server/api.js', [
  ['Verify your mobile number first.', 'Please confirm your mobile number first.'],
  ['Tell me what happened first.', 'Tell me what happened first.'],
  ['No such endpoint.', 'That address does not exist.'],
], { json: false });

edit('server/speech.js', [
  ['Speech budget for this prototype is used up.', 'The voice budget for this demo is finished.'],
  ['Could not reach the speech service.', 'We could not reach the voice service.'],
  ['That recording is too long.', 'That recording is too long.'],
  ['No speech key configured.', 'Voice is not switched on.'],
]);

edit('server/guardrails.js', [
  ['Too many requests in a minute. This is a prototype on a small budget.',
   'Too many requests in a minute. This is a demo running on a small budget.'],
]);

/* ── and Smiti herself: the register of everything she generates ───────────── */
{
  const F = 'server/ai.js';
  let s = fs.readFileSync(F, 'utf8');
  const anchor = 'RULE TWO: never ask which office, department, authority or ministry handles this.';
  if (!s.includes(anchor)) {
    misses.push(F + ' :: RULE TWO anchor');
  } else if (s.includes('RULE ONE AND A HALF')) {
    console.log('  server/ai.js               = prompt rule already present');
  } else {
    const inserted = `RULE ONE AND A HALF: use the simplest words that still say the true thing. Short sentences.
No official register. Say "fixed" not "redressed", "goes up to" not "escalates", "the law says"
not "statutory", "whose job it is" not "jurisdiction". If a real office has a long official name,
use the name and then say plainly what that officer does — the name is how they ask for the right
person, and the plain words are how they know why. A sentence a person would not say out loud is
the wrong sentence, even when every word in it is correct.

${anchor}`;
    s = s.split(anchor).join(inserted);
    fs.writeFileSync(F, s);
    console.log('  server/ai.js               plain-language rule added to the intake prompt');
    done += 1;
  }
}

/* ── report ────────────────────────────────────────────────────────────────── */
console.log('\n' + done + ' rewritten');
if (misses.length) {
  console.log(misses.length + ' anchors did not match:');
  for (const m of misses) console.log('  ! ' + m);
}
