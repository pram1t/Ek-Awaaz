/* The one thing the government's assistant does better than us, and a domain we were missing.
 *
 * Samadhan Didi, on a pension grievance, asks for the PPO number — and then shows a panel listing
 * exactly what it still does not have: "PPO number, the office they retired from, year of
 * retirement: no information given". That is the right instinct twice over.
 *
 * A PPO number is not an identifier we refuse. The rule was never "no numbers" — it is "no account,
 * card, Aadhaar or PAN number", because those are what DPDP makes indefensible to hold and what a
 * fraudster wants. A scheme reference is the opposite: it is the string an officer types to find the
 * file, it identifies a claim rather than a person, and a citizen who quotes it gets helped faster.
 * Refusing to ask for it is not caution, it is just being less useful.
 *
 * Three of fifteen domains had this list. Twelve did not, so for twelve problems the conversation
 * had no idea what the office would actually need — and pension was not a domain at all, which is
 * why a pension grievance fell through to "other" and got asked for its village and block.
 *
 * Every reference below is checked against askIsBanned by scripts/try-references.mjs. If one of
 * these ever names a card or an account number, that suite fails.
 */

import fs from 'node:fs';

const F = 'data/routing.json';
const doc = JSON.parse(fs.readFileSync(F, 'utf8'));

/* label/hint are read by a citizen; `required` marks the one an officer genuinely cannot work
   without. `safe` is a note to ourselves about why this is askable. */
const REFS = {
  'infra.road': [
    { key: 'road_name', label: 'The road or stretch', hint: 'A name, or the landmark at each end.', required: true },
    { key: 'since', label: 'How long it has been like this', hint: 'A month is enough.', required: false }
  ],
  'infra.water': [
    { key: 'connection', label: 'Your consumer number', hint: 'On your water bill, if you get one. Skip it if you do not.', required: false },
    { key: 'since', label: 'Since when', hint: 'Roughly how long the supply has been failing.', required: true }
  ],
  'infra.power': [
    { key: 'consumer_no', label: 'Your consumer number', hint: 'On your electricity bill — not your bank account number.', required: true },
    { key: 'since', label: 'Since when', hint: 'When the outage or the wrong billing started.', required: true }
  ],
  'supply.ration': [
    { key: 'shop', label: 'The ration shop', hint: 'Its name, its number, or where it is.', required: true },
    { key: 'month', label: 'Which month you were refused', hint: 'The most recent one will do.', required: true },
    { key: 'household', label: 'People in your household', hint: 'This decides the quantity you are owed.', required: false }
  ],
  'work.mgnrega': [
    { key: 'job_card', label: 'Your job card number', hint: 'On the card itself. It is not an account number.', required: true },
    { key: 'work_period', label: 'The days you worked', hint: 'The weeks or the muster roll dates, roughly.', required: true }
  ],
  'money.pmkisan': [
    { key: 'registration', label: 'Your PM-KISAN registration number', hint: 'From the portal or your acknowledgement slip.', required: true },
    { key: 'instalment', label: 'Which instalment is missing', hint: 'For example, the one due in April.', required: true }
  ],
  'property.housing': [
    { key: 'project', label: 'The project and the builder', hint: 'The name on your agreement.', required: true },
    { key: 'rera_no', label: 'The RERA registration number', hint: 'On the builder’s hoarding or the agreement. Skip if you do not have it.', required: false },
    { key: 'possession_due', label: 'The handover date you were promised', hint: 'From the agreement.', required: true }
  ],
  'travel.rail': [
    { key: 'pnr', label: 'Your PNR', hint: '10 digits on the ticket. It is not a payment number.', required: true },
    { key: 'journey_date', label: 'The date of the journey', hint: '', required: true }
  ],
  'telecom.service': [
    { key: 'docket', label: 'The docket number the operator gave you', hint: 'From the SMS or email when you first complained.', required: true },
    { key: 'complained_on', label: 'When you first complained to them', hint: 'This decides when you can go above them.', required: true }
  ],
  'office.inaction': [
    { key: 'reference', label: 'Your application or file number', hint: 'From the receipt or acknowledgement. Not an account number.', required: true },
    { key: 'applied_on', label: 'When you applied', hint: 'Approximate month is fine.', required: true }
  ],
  'integrity.bribe': [
    { key: 'office', label: 'Which office', hint: 'The office and the town. Only what you are willing to have on record.', required: true },
    { key: 'service', label: 'What you were trying to get', hint: 'The certificate, licence or service.', required: true }
  ],
  other: [
    { key: 'reference', label: 'Any reference number you were given', hint: 'From a receipt, an SMS or an acknowledgement. Skip it if there is none.', required: false }
  ]
};

/* The domain that was missing. Pension is among the highest-volume grievance categories in India and
   has its own portal (CPENGRAMS) — and we had no entry for it, so every pension grievance landed in
   "other" and was asked for its village and block. */
const PENSION = {
  label: 'Pension not received',
  tier: 'Central',
  office: 'Pension Disbursing Bank, then the Pension Sanctioning Authority',
  reason: 'A pension that has stopped is either the paying bank’s doing or the sanctioning office’s, and the PPO number tells us which.',
  legal_basis: 'Central Civil Services (Pension) Rules; CPENGRAMS for central pensioners',
  channel: 'CPENGRAMS',
  days: 30,
  evidence: 'Your PPO copy or the last pension slip, if you have one.',
  isPublic: false,
  identifiers: [
    { key: 'ppo', label: 'Your PPO number', hint: 'On your pension payment order or your pension slip. It is not a bank account number.', required: true },
    { key: 'retired_from', label: 'The office you retired from', hint: 'Department and place.', required: true },
    { key: 'last_paid', label: 'The last month you were paid', hint: 'Approximate is fine.', required: true }
  ],
  asks: [
    { label: 'What stopped', q: 'What happened with your pension — did it stop, or is it short?', hint: 'And which month it last came.' },
    { label: 'Who pays it', q: 'Which bank or office pays your pension?', hint: 'The branch name is enough.' }
  ]
};

let added = 0, refs = 0;

if (!doc.domains['money.pension']) {
  doc.domains['money.pension'] = PENSION;
  added++;
}

for (const [key, list] of Object.entries(REFS)) {
  const d = doc.domains[key];
  if (!d) { console.log('  ! no such domain: ' + key); continue; }
  if (d.identifiers) continue;                 /* never overwrite a hand-written list */
  d.identifiers = list;
  refs++;
}

fs.writeFileSync(F, JSON.stringify(doc, null, 2) + '\n');

const total = Object.values(doc.domains).filter((d) => d.identifiers).length;
console.log('  pension domain added: ' + added);
console.log('  reference lists added: ' + refs);
console.log('  domains with references: ' + total + ' of ' + Object.keys(doc.domains).length);
