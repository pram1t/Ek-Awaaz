/* A category card knew the topic and then threw it away.
 *
 * "Report a road issue" was an <a href="#report"> — it scrolled the page down to a text box and
 * asked "What happened?", so the one thing the click had already established was discarded and the
 * person had to say "road" again. On a site whose argument is that a citizen should not have to
 * classify their own problem, making them restate a classification they just made by clicking is
 * the same mistake in a smaller place.
 *
 * Now the card carries its topic to the chat, and the chat opens knowing it: no generic
 * "क्या हुआ?", but the question you would actually ask someone who has already said "road" —
 * what is wrong with it and where. The topic is echoed back on screen so the person can see it was
 * understood, and can correct it if the card was the wrong one.
 *
 * Implemented by giving the existing grievance step a topic-specific question rather than adding a
 * parallel flow. Everything downstream — classify, the follow-ups, routing, review — is untouched,
 * which is the difference between a change that can break the journey and one that cannot.
 */

import fs from 'node:fs';
/* This repo is CRLF. A multi-line anchor written with a bare newline silently matches nothing,
   which has cost real time before — so every multi-line replace goes through this. Built from
   character codes rather than escapes, because escapes are what got mangled writing it. */
const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const nl = (str, sample) => (sample.indexOf(CRLF) >= 0 ? str.split(LF).join(CRLF) : str);
const swap = (hay, from, to) => {
  const f = nl(from, hay);
  if (hay.indexOf(f) < 0) return null;
  return hay.split(f).join(nl(to, hay));
};


/* ── 1. the cards carry their topic ─────────────────────────────────────────── */
{
  const F = 'public/index.html';
  let s = fs.readFileSync(F, 'utf8');

  /* card link text → the client-side domain key in report.html */
  const TOPIC = {
    'Report a road issue': 'road',
    'Report an electricity issue': 'power',
    'Report a banking issue': 'bank',
    'Report a PF issue': 'pf',
    'Report a ration issue': 'ration',
    'Report a water issue': 'water',
    'Report an insurance issue': 'other',
    'Report a pension issue': 'other',
    'Report an ID issue': 'id',
    'Report a railway issue': 'rail',
    'Report a police issue': 'other',
    'Report an RTI issue': 'other',
  };

  let n = 0, missed = [];
  for (const [label, key] of Object.entries(TOPIC)) {
    const from = `<a href="#report">${label} `;
    const to = `<a href="/report?topic=${key}">${label} `;
    if (!s.includes(from)) { missed.push(label); continue; }
    s = s.split(from).join(to);
    n++;
  }
  fs.writeFileSync(F, s);
  console.log(`  index.html — ${n} cards now open the chat with their topic`);
  if (missed.length) console.log('    ! no anchor for: ' + missed.join(', '));
}

/* ── 2. the chat opens knowing it ───────────────────────────────────────────── */
{
  const F = 'public/report.html';
  let s = fs.readFileSync(F, 'utf8');

  if (s.includes('const topic =')) { console.log('  = report.html already applied'); process.exit(0); }

  /* read the topic next to the existing issue handoff */
  const ISSUE_END = `  try { sessionStorage.removeItem(KEY); } catch (e) {}
  return text;
})();`;
  const TOPIC_READ = ISSUE_END + `

/* Which card was clicked, if the person came from one. Read before the issue IIFE strips the
   query string, and kept so the opening question can be about the thing they already told us. */
const topic = (function () {
  const KEY = 'ekawaaz.topic';
  let t = '';
  try { t = sessionStorage.getItem(KEY) || ''; } catch (e) {}
  if (!t) {
    const p = new URLSearchParams(location.search).get('topic');
    if (p) { t = p; try { sessionStorage.setItem(KEY, t); } catch (e) {} }
  }
  try { sessionStorage.removeItem(KEY); } catch (e) {}
  return t;
})();

/* The question to open with when the topic is already known. Not "what happened" — the question
   you would actually ask someone who has just said "road". */
const TOPIC_OPENER = {
  road:   { q: 'What is wrong with the road?', hint: 'Potholes, a stretch never repaired, water standing on it. Tell me what you see, and roughly where it is.', chips: ['Potholes never repaired', 'Whole stretch broken', 'Water stands on it'] },
  power:  { q: 'What is happening with your electricity?', hint: 'A long outage, a transformer gone, or a bill that is wrong. Say which, and since when.', chips: ['Long daily outage', 'Transformer burnt out', 'Bill is wrong'] },
  water:  { q: 'What is wrong with the water supply?', hint: 'No supply, very little, or dirty water. Tell me how long it has been like this.', chips: ['No supply at all', 'Only for a few minutes', 'Water is dirty'] },
  bank:   { q: 'What happened with the bank?', hint: 'Money debited that you did not spend, a fraud, or a payment that never arrived. Do not type your account number — I will never ask for it.', chips: ['Money debited wrongly', 'Fraud on my account', 'Payment not received'] },
  pf:     { q: 'What is stuck with your PF?', hint: 'A withdrawal claim, a transfer, or a KYC problem. Tell me when you applied.', chips: ['Claim rejected', 'Claim stuck for months', 'Transfer not done'] },
  ration: { q: 'What happened at the ration shop?', hint: 'Less than your due, refused outright, or the shop stays shut. Tell me which month.', chips: ['Given less than my due', 'Refused outright', 'Shop stays closed'] },
  rail:   { q: 'What happened — the train, the ticket, or the station?', hint: 'A refund not received, a booking problem, or a condition at the station.', chips: ['Refund not received', 'Booking problem', 'Condition at the station'] },
  tax:    { q: 'Which refund are you waiting for?', hint: 'Tell me the assessment year and roughly when you filed. Do not type your PAN.', chips: ['Refund not received', 'Refund less than expected'] },
  id:     { q: 'Which document is it, and what went wrong?', hint: 'PAN, Aadhaar, or another government ID. Tell me what you applied for and when. Do not type the number itself.', chips: ['Correction not done', 'Application stuck', 'Card never arrived'] },
  bribe:  { q: 'Tell me what was asked for.', hint: 'A designation is enough if you do not have a name. Put in only what you are willing to have on record.', chips: null },
  other:  { q: 'Tell me what happened.', hint: 'Say it the way you would tell a neighbour. I find the office from your words — you never pick a department.', chips: null },
};`;

  { const out = swap(s, ISSUE_END, TOPIC_READ); if (!out) { console.log('  ! issue IIFE anchor not found'); process.exit(1); } s = out; }

  /* the grievance step uses the topic's question when there is one */
  const STEP_FROM = `    steps.push({ key: 'grievance', label: 'Grievance', q: 'क्या हुआ? What happened?', hint: 'Say it the way you would tell a neighbour. I find the office from your words — you never pick a department.', chips: ['Road not repaired', 'Ration denied', 'Bank debited wrongly', 'PF claim stuck'] });`;
  const STEP_TO = `    /* If they arrived by clicking a category, open on that category instead of asking them to
       classify a problem they have already classified. */
    const op = topic && TOPIC_OPENER[topic];
    steps.push(op
      ? { key: 'grievance', label: 'Grievance', q: op.q, hint: op.hint, chips: op.chips }
      : { key: 'grievance', label: 'Grievance', q: 'क्या हुआ? What happened?', hint: 'Say it the way you would tell a neighbour. I find the office from your words — you never pick a department.', chips: ['Road not repaired', 'Ration denied', 'Bank debited wrongly', 'PF claim stuck'] });`;

  { const out = swap(s, STEP_FROM, STEP_TO); if (!out) { console.log('  ! grievance step anchor not found'); process.exit(1); } s = out; }

  /* on a fresh start with a topic, seed the domain and say which topic we are on */
  const BOOT_FROM = `} else {
  buildSteps();
  advance();
}`;
  const BOOT_TO = `} else {
  /* Seed the domain from the clicked card so the follow-ups and the public/private decision are
     already the right ones for this topic. The server still classifies from what they type, and
     overwrites this — the seed only decides what we open with. */
  if (topic) {
    const seeded = domains.find((d) => d.key === topic);
    if (seeded) { domain = seeded; isPublic = !!seeded.isPublic; }
    const nameOf = { road: 'Roads and potholes', power: 'Electricity', water: 'Water supply',
      bank: 'Banking and payments', pf: 'Provident fund', ration: 'Ration and PDS',
      rail: 'Railways', tax: 'Income tax refund', id: 'Government ID', bribe: 'A demand for money',
      other: 'Something else' }[topic];
    if (nameOf) bubble('them', '<p class="aside">' + esc(nameOf) + ' — I have that. If it is not the right one, just tell me and I will change it.</p>');
  }
  buildSteps();
  advance();
}`;

  { const out = swap(s, BOOT_FROM, BOOT_TO); if (!out) { console.log('  ! boot anchor not found'); process.exit(1); } s = out; }

  fs.writeFileSync(F, s);
  console.log('  report.html — the chat opens on the clicked topic');
}
