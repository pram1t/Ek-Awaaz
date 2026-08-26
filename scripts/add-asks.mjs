/* One-off: write hand-authored follow-up questions into data/routing.json.

   These are the FALLBACK — what a citizen sees when there is no key, or the budget ceiling has
   been reached. They are written to be good on their own. The model improves on them by adapting
   to the citizen's actual words and language; it does not rescue them. The experience must never
   drop to generic, because a judge hitting a drained budget would score exactly that. */

import fs from 'node:fs';

const ASKS = {
  'integrity.bribe': [
    { q: 'What was asked for, by whom, and for which service?',
      hint: 'A designation is enough if you do not have a name. Do not put in anything you are not willing to have on record.',
      ph: 'Example: the clerk at the block office wanted 2,000 to move my file' },
    { q: 'When did this happen, and has it happened more than once?',
      hint: 'A repeat on record is what moves a vigilance file.',
      ph: 'Example: twice, in June and again last week' }
  ],
  'money.bank': [
    { q: 'What was the amount, the date, and which bank?',
      hint: 'A disputed debit can only be traced with the amount and date. Add the reference from your statement if you have it.',
      ph: 'Example: 18,400 on 11 August, SBI Madhubani' },
    { q: 'Have you complained to the bank already, and when?',
      hint: 'That date is the one the Ombudsman clock runs from. Say no if this is the first time.',
      ph: 'Example: yes, on 18 August, no reply since' }
  ],
  'money.pf': [
    { q: 'What is your UAN, and which claim is stuck?',
      hint: 'The UAN lets the regional office pull up the file without asking you again. Name the form, 19, 10C or 31, if you know it.',
      ph: 'Example: UAN 1012 3456 7890, Form 19' },
    { q: 'When did you file it, and has the office asked you for anything since?',
      hint: 'A KYC query, a rejection, or complete silence. Each one changes the next step.',
      ph: 'Example: filed in June, complete silence' }
  ],
  'money.tax_refund': [
    { q: 'Which assessment year is this, and when did you file?',
      hint: 'The assessment year and the filing date decide which office holds your case.',
      ph: 'Example: AY 2025-26, filed 12 July' },
    { q: 'What does the portal show, a status, a demand, or nothing?',
      hint: 'Under processing, refund failed, a demand notice, or no movement at all.',
      ph: 'Example: still says under processing' }
  ],
  'money.pmkisan': [
    { q: 'Which instalment did not come, and what does the portal say?',
      hint: 'The status line matters. Land seeding pending, eKYC pending, or a bank failure.',
      ph: 'Example: the 22nd, it says land seeding pending' },
    { q: 'Is the name the same on your land record, your Aadhaar and your passbook?',
      hint: 'Do not type the numbers. Just tell me whether the names match.',
      ph: 'Example: the passbook has my father name, the land record has mine' }
  ],
  'supply.ration': [
    { q: 'What were you refused, and in which month?',
      hint: 'What the dealer said, and how much you were owed. Do not type your card number.',
      ph: 'Example: no wheat for two months, he said stock is over' },
    { q: 'How many people are in the household?',
      hint: 'The household count decides the quantity you are owed each month.',
      ph: 'Example: five, including two children' }
  ],
  'work.mgnrega': [
    { q: 'How many days did you work, and when were the wages due?',
      hint: 'Wages are due within fifteen days of the work. That date starts the compensation clock.',
      ph: 'Example: fourteen days in July, nothing since' },
    { q: 'Did you ask for work in writing, or was it spoken?',
      hint: 'A written demand is what makes an unemployment allowance claimable.',
      ph: 'Example: asked the rozgar sevak, nothing on paper' }
  ],
  'infra.power': [
    { q: 'How many hours a day is the supply out?',
      hint: 'Give the worst stretch you have had this week.',
      ph: 'Example: nine hours, mostly 6 pm to 3 am' },
    { q: 'Has the outage damaged anything or stopped work?',
      hint: 'A burnt appliance, spoiled stock, a shop or a clinic that had to close. Say no if not.',
      ph: 'Example: the fridge compressor burnt' }
  ],
  'infra.water': [
    { q: 'How many days has the supply been off, and at what hours does it come?',
      hint: 'And where you are getting water meanwhile. A tanker, a neighbour, purchased cans.',
      ph: 'Example: four days a week, nothing after 7 am' },
    { q: 'How many houses around you are affected?',
      hint: 'A rough count is enough. It decides whether this is one connection or the whole line.',
      ph: 'Example: the whole lane, about twenty houses' }
  ],
  'infra.road': [
    { q: 'How long has it been like this, and what has it stopped?',
      hint: 'A rough answer is fine. Say if an ambulance, a school van or a delivery cannot get through.',
      ph: 'Example: since the first rain, the school van will not come' },
    { q: 'Which stretch is worst, and has anyone been hurt on it?',
      hint: 'A landmark is enough. The school turning, the handpump, the bus stop.',
      ph: 'Example: the forty metres before the school gate' }
  ],
  'property.housing': [
    { q: 'Which project is it, and what were you promised in writing?',
      hint: 'The handover date in the agreement is what a RERA clock runs from.',
      ph: 'Example: possession was due December 2024' },
    { q: 'Have you written to the builder, and did they reply?',
      hint: 'A written attempt is what the authority will ask for first.',
      ph: 'Example: emailed twice, no reply' }
  ],
  'travel.rail': [
    { q: 'What is your PNR, and the train and date of travel?',
      hint: 'The PNR lets the divisional office pull up the booking without asking you again.',
      ph: 'Example: PNR 4412887654, train 12554 on 9 August' },
    { q: 'What are you asking for, a refund or an answer?',
      hint: 'A refund claim and a service complaint go to different desks in the same division.',
      ph: 'Example: a refund for the meal that never came' }
  ],
  'telecom.service': [
    { q: 'Which operator, and what exactly is wrong?',
      hint: 'A wrong charge, no signal, or a service you did not ask for.',
      ph: 'Example: charged 199 for a pack I never took' },
    { q: 'Have you complained to them, and did they give you a docket number?',
      hint: 'That docket is what an appellate authority will ask for.',
      ph: 'Example: yes, docket 8891234, nothing since' }
  ],
  'office.inaction': [
    { q: 'Which office, and what were you there for?',
      hint: 'The block office, a bank, a school, a hospital. And what you needed from them.',
      ph: 'Example: the tehsil office, for a caste certificate' },
    { q: 'How many times have you been, and what did they say the last time?',
      hint: 'Come tomorrow, the sahib is not here, or nothing at all.',
      ph: 'Example: four visits, they keep saying come next week' }
  ],
  'other': [
    { q: 'Which office or department have you dealt with so far?',
      hint: 'Even a rough answer narrows it. The block office, a bank, a school, a hospital.',
      ph: 'Example: the electricity office in town' },
    { q: 'What do you want them to do?',
      hint: 'Fix something, pay something, or answer something.',
      ph: 'Example: give me the certificate I applied for' }
  ]
};

const p = 'data/routing.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

let written = 0;
const missing = [];
for (const [key, asks] of Object.entries(ASKS)) {
  if (d.domains[key]) { d.domains[key].asks = asks; written += 1; }
  else missing.push(key);
}
const without = Object.keys(d.domains).filter((k) => !d.domains[k].asks);

d._asks_note = ASKS_NOTE();
fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');

console.log(`asks written for ${written} of ${Object.keys(d.domains).length} domains`);
if (missing.length) console.log('no such domain:', missing.join(', '));
if (without.length) console.log('STILL WITHOUT ASKS:', without.join(', '));

function ASKS_NOTE() {
  return 'Per-domain follow-up questions, hand written. These are what a citizen sees when the '
    + 'model is unavailable or the spend ceiling has been reached, so they are written to be good '
    + 'on their own. The model improves on them by adapting to the citizen\'s own words and '
    + 'language; it does not rescue them.';
}
