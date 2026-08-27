/* Plain English across the site.
 *
 * The copy was written the way a policy note is written: "the route was identified as", "an
 * independent adjudicator", "sectoral", "signatures", "escalated", "the 21-day window lapsed".
 * Every one of those is a word a person would not use out loud, on a site whose whole argument is
 * that the citizen should not have to learn the state's vocabulary to be heard. Writing the
 * interface in that same vocabulary undoes the point.
 *
 * The rules used here:
 *   · say who does what — "we send it to", not "it is routed to"
 *   · a short familiar word beats a precise long one — "names" not "signatures", "law" not "statute"
 *   · one idea per sentence; cut the clause that only qualifies
 *   · keep the government's own words where the argument depends on them: "disposed", "grievance",
 *     and the named offices and schemes. Those are evidence, not decoration.
 *
 * Every replacement is an exact string, and the script reports anything that did not match rather
 * than failing quietly — a copy pass that silently skips half its edits is worse than none.
 */

import fs from 'node:fs';

const edits = {
  'public/index.html': [
    ['Speak or type your problem in your own language. No ministry list, no categories. Ek Awaaz routes it to the office that can act and shows the stronger remedy available to you.',
     'Say your problem in your own words. No ministry list, no categories. We find the office that can fix it, and show you the stronger option you may not know you have.'],

    ['Most people should not need to understand an organisation chart to get help. We make the route clear before a grievance is submitted.',
     'You should not have to know how the government is arranged to get help. We show you which office it goes to before anything is sent.'],

    ['We use the issue and location to explain which local, state, sectoral, or central office can actually act.',
     'From your problem and your location, we work out which office can actually fix it.'],

    ['When the issue already affects your area, add your support instead of creating another duplicate complaint.',
     'If someone near you has already reported it, add your name to their case instead of starting a new one.'],

    ['Every one of these has a stronger remedy sitting behind it — a statutory deadline, an independent adjudicator, sometimes money. Most portals show you only the first office. Both are named here before you file.',
     'Behind each of these is something stronger than a complaint — a deadline the office must meet, someone outside the department who can decide, sometimes money you are owed. Most portals show you only the first office. We name both, before you file.'],

    ['Reply windows are the commonly stated norms and vary by state. Once your case is filed, Ek Awaaz shows the clock running on it.',
     'These reply times are the usual ones and change from state to state. Once your case is filed, we show you the days counting down.'],

    ['One case, one responsible office, and a visible count of the households affected. At 50 local signatures, this case is automatically escalated to the District Collector.',
     'One case, one office answerable for it, and a count of the households anyone can see. At 50 names, it goes to the District Collector on its own.'],

    ['Residents reported a damaged 40-metre stretch after the first rain. The route was identified as the Block Development Officer—not Delhi—because this is a village road.',
     'People reported a broken 40-metre stretch after the first rain. It went to the Block Development Officer, not Delhi, because a village road is his job.'],

    ['A transformer failed and eleven streets went dark for nine days. The case was routed to the discom executive engineer, with the state electricity regulator named as the fallback if the 21-day window lapsed.',
     'A transformer burnt out and eleven streets were dark for nine days. The case went to the discom executive engineer. If he missed 21 days, the next step was already named: the state electricity regulator.'],

    ['Three kilometres of highway lighting had been dead for two months at an accident-prone bend. Because it is a national highway, the case went to the NHAI project director, not the municipality.',
     'Three kilometres of highway lights had been dead for two months, on a bend where crashes happen. It is a national highway, so it went to the NHAI project director, not the municipality.'],

    ['A collapsed roof section left thirty-two children sitting outside through the monsoon. Mothers filed jointly; the case was routed to the Child Development Project Officer with the district programme officer above.',
     'A roof fell in and thirty-two children sat outside through the monsoon. The mothers filed one case together. It went to the Child Development Project Officer, with the district programme officer above him if nothing moved.'],

    ['Didi asks one question at a time, in your language. She never asks you to name a department, and nothing is filed until you have read it back.',
     'She asks one question at a time, in your language. She never asks you to name a department, and nothing is sent until you have read it and agreed.'],

    ['I will find who owns the problem, what clock that office is on, and what you can do if they miss it. You see all of it before anything is sent.',
     'I will find whose job it is, how long they have to reply, and what you can do if they do not. You see all of it before anything is sent.'],
  ],

  'public/near-you.html': [
    ['If a case for your problem is already open, adding your name to it does more than filing your own. One case with fifty names escalates. Fifty separate cases each start at day one.',
     'If a case for your problem is already open, add your name to it instead of filing your own. One case with fifty names moves. Fifty separate cases each start again at day one.'],

    ['A single case carries one responsible office, one clock, and a visible count of the households affected. Duplicate filings split that count, and an office can close each one separately.',
     'One case means one office answerable, one deadline, and a count of households anyone can see. Separate cases split that count, and the office can close each one on its own.'],

    ['Only public cases appear here. A personal grievance — a pension, a bank debit, a service matter — is never listed, and nobody can add their name to it. Names of people supporting a case are',
     'Only shared cases appear here. A personal one — a pension, a bank debit, your own job — is never listed, and nobody can add their name to it. The names of people on a case are'],
  ],

  'public/report.html': [
    ['Your name is never shown on a public case. Only the issue, the office, and the number of people supporting it are visible.',
     'Your name is never shown on a shared case. Only the problem, the office, and how many people joined.'],
  ],
};

/* ── the overlay, and the words used inside the join flow ──────────────────── */
edits['public/session.js'] = [
  ['is a personal case — a provident fund claim, a bank debit, a refund. Only you can see it, so a signature from a neighbour would mean nothing on it. Shared cases are the ones about a road, a handpump, a ration shop or a feeder.',
   'is a personal case — a PF claim, a bank debit, a refund. Only you can see it, so a neighbour adding their name to it would mean nothing. Shared cases are the ones about a road, a handpump, a ration shop or an electricity line.'],
  ['We could not find a public case for', 'We could not find a shared case for'],
  ['Nobody else can add their name to this one.', 'Nobody else can add their name to this one.'],
  ['Public grievance number', 'Case number'],
  ['Your name is never shown to other signatories.', 'Your name is never shown to the other people on this case.'],
];

/* ── the reasons shown under "where it goes" ───────────────────────────────── */
const routingText = [
  ['PMGSY roads have their own inspection chain under the Ministry of Rural Development.',
   'PMGSY roads are checked by their own team, under the Ministry of Rural Development.'],
  ['Scheme of the Ministry of Rural Development — no statute',
   'A central government scheme, not a law'],
  ['A village road is a Panchayat subject under the Eleventh Schedule, so this does not go to Delhi.',
   'A village road is the Panchayat’s job, so this does not go to Delhi.'],
  ['Roads and bridges are a municipal subject under the Twelfth Schedule.',
   'Roads and bridges are the municipality’s job.'],
  ['No online system exists for Panchayat roads anywhere in India. The honest route is the state CM helpline, pre-filled.',
   'There is no online system for Panchayat roads anywhere in India. The honest way in is the state CM helpline, filled in for you.'],
];

/* ── apply ─────────────────────────────────────────────────────────────────── */
let done = 0, missed = [];

for (const [file, pairs] of Object.entries(edits)) {
  if (!fs.existsSync(file)) { missed.push(file + ' (no such file)'); continue; }
  let s = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [from, to] of pairs) {
    if (from === to) continue;
    if (!s.includes(from)) { missed.push(file + ' :: ' + from.slice(0, 58)); continue; }
    s = s.split(from).join(to);
    n++;
  }
  if (n) { fs.writeFileSync(file, s); console.log('  ' + file + ' — ' + n + ' rewritten'); done += n; }
}

/* routing.json is data, so edit the parsed tree and write it back formatted */
{
  const F = 'data/routing.json';
  let raw = fs.readFileSync(F, 'utf8');
  let n = 0;
  for (const [from, to] of routingText) {
    if (!raw.includes(from)) { missed.push(F + ' :: ' + from.slice(0, 58)); continue; }
    raw = raw.split(from).join(to);
    n++;
  }
  if (n) {
    JSON.parse(raw);                       /* refuse to write a file we just broke */
    fs.writeFileSync(F, raw);
    console.log('  ' + F + ' — ' + n + ' rewritten (parses clean)');
    done += n;
  }
}

console.log('\n' + done + ' strings rewritten');
if (missed.length) {
  console.log(missed.length + ' did not match — anchors to check:');
  for (const m of missed) console.log('  ! ' + m);
}
