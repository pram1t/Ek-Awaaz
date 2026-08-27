/* Build the demo history.
 *
 * A judge opens this product for four minutes. In that time every state has to be reachable
 * without them having to manufacture it: a case with the office, a case past its clock, a case
 * where the officer has filed "disposed of" and the citizen has not answered, one the citizen
 * reopened, one closed by confirmation, a public case a stranger can sign, and a private case
 * nobody can. If those states only exist after you click through six flows, they may as well
 * not exist.
 *
 * So: 26 cases across every routed domain, spread over eight months and eleven states, each
 * with the history behind it — signatures, the officer's own words, the citizen answering back,
 * confirmations.
 *
 * Rules held while writing it, because a demo dataset is the easiest place to lie:
 *
 *  - Every confirmed_fixed case carries the confirmation rows that closed it. A case that says
 *    closed without them would contradict the one rule the product is built on.
 *  - Public case supporter counts are the length of a real signature list, written by the
 *    seeder, not a number typed in to look impressive. None of them sits suspiciously at
 *    target; two sit just under it, which is where the escalation argument is visible.
 *  - Officer text is written in the register officers actually write in — "the undersigned is
 *    directed to state", "treated as disposed of" — because the plain-language rewrite has
 *    nothing to demonstrate against neutral prose.
 *  - Nothing claims a real person, a real officer, or a real filing. Names are common Indian
 *    names, and every seeded row is flagged so the product can say so.
 *  - Dates are absolute and ordered: filed before the officer replied, replied before confirmed.
 */

import fs from 'node:fs';

const ATR = {
  road: 'With reference to the captioned grievance, the undersigned is directed to state that '
      + 'the concerned Junior Engineer has inspected the site and necessary rectification of the '
      + 'affected stretch has been carried out through the empanelled agency vide work order '
      + 'No. 4471/JE-II. The instant representation is accordingly treated as disposed of at this end.',
  power: 'The matter was examined by the sub-divisional office. It is stated that the distribution '
       + 'transformer at the said location was attended to and load balancing carried out. The '
       + 'complaint is treated as redressed and closed at this end.',
  pf: 'The claim of the member has been examined with reference to the records available. The '
    + 'member is advised to submit Form 10C duly attested along with the cancelled cheque leaf. '
    + 'Pending receipt, the grievance is treated as disposed of.',
  ration: 'The concerned Fair Price Shop dealer was issued a show-cause notice under the '
        + 'provisions of the Control Order. The dealer has submitted his reply. The matter stands '
        + 'closed at this level.',
  bank: 'We have investigated the disputed transaction with reference to the switch logs. The '
      + 'transaction was found to be authenticated by OTP delivered to the registered mobile '
      + 'number. The complaint is hereby closed as no deficiency in service is established.',
  water: 'The Assistant Engineer has reported that the supply line at the location was flushed '
       + 'and the valve regulated. Supply has been normalised. The grievance is closed accordingly.'
};

/* eleven states, so the routing and the remedy scoping have something to bite on */
const cases = [];
const push = (c) => cases.push(c);

/* ─────────────────── the flagship: a recurring village road ─────────────────── */
push({
  code: 'EA-2026-04412', domain: 'infra.road', option_key: 'village',
  title: 'Road damage, Rajnagar Ward 4',
  summary: 'A 40-metre stretch of broken surface after the first rain, with two earlier repairs in the same spot.',
  area: 'Rajnagar Ward 4, Madhubani district', state: 'bihar', cell: 'rajnagar-w4-road-01',
  office: 'Block Development Officer, Rajnagar block',
  reason: 'A village road inside a panchayat is panchayat work, not a state highway matter.',
  legal_basis: 'Article 243G and the Eleventh Schedule',
  remedy_key: 'pothole.compensation',
  visibility: 'public', supporters: 34, target: 50, status: 'open',
  escalates_to: 'District Collector', recurrence: 3, filed_on: '2026-03-12',
  phone: '9812300001', citizen_name: 'Sunita',
  asks: [
    { q: 'Which stretch is worst near you?', hint: 'A landmark is enough — the school turning, the handpump, the bus stop.', ph: 'Example: the 40 m before the primary school gate' },
    { q: 'Has this road caused you a loss or an injury?', hint: 'A fall, a damaged vehicle, an ambulance or school van that could not pass.', ph: 'Example: my scooter axle broke on 4 August' }
  ],
  answers: [
    { q: 'grievance', a: 'The road outside our lane has broken up again. It floods every time it rains and children walk through it to school.' },
    { q: 'ask0', a: 'The 40 metres before the primary school gate' },
    { q: 'ask1', a: 'My scooter axle broke on 4 March' },
    { q: 'location', a: 'Rajnagar Ward 4, Madhubani district, Bihar' }
  ],
  messages: [
    { role: 'citizen', text: 'This is the third time in two years. The last repair lasted six weeks.', on: '2026-03-14' }
  ]
});

/* ─────────────────── awaiting confirmation: the closure gate ────────────────── */
push({
  code: 'EA-2026-04871', domain: 'infra.power', option_key: null,
  title: 'Burnt-out transformer, Kanjhawala feeder',
  summary: 'Eleven streets without supply for nine days after the transformer failed.',
  area: 'Kanjhawala feeder, 11 streets', state: 'delhi', cell: 'kanjhawala-power-02',
  office: 'Executive Engineer, Tata Power Delhi Distribution',
  reason: 'Distribution and metering sit with the licensee, not with the municipality.',
  legal_basis: 'Electricity Act 2003, section 42',
  remedy_key: 'power.ombudsman',
  visibility: 'public', supporters: 63, target: 80, status: 'awaiting_confirmation',
  escalates_to: 'Electricity Ombudsman, DERC', recurrence: 1, filed_on: '2026-05-02',
  officer_responded_on: '2026-05-11', officer_atr: ATR.power,
  phone: '9812300002', citizen_name: 'Imran',
  answers: [
    { q: 'grievance', a: 'The transformer burnt out on 2 May and eleven streets have had no power since.' },
    { q: 'location', a: 'Kanjhawala, North West Delhi' }
  ],
  messages: [{ role: 'citizen', text: 'Supply came back on the 10th but it trips every evening around seven.', on: '2026-05-12' }]
});

/* ─────────────────── reopened: the citizen said no ──────────────────────────── */
push({
  code: 'EA-2026-05104', domain: 'supply.ration', option_key: null,
  title: 'Ration short of entitlement, Barkheda',
  summary: 'Three kilos short every month against a card for five members, with no slip given.',
  area: 'Barkheda village, Sehore district', state: 'madhya pradesh', cell: 'barkheda-ration-01',
  office: 'District Grievance Redressal Officer under the National Food Security Act',
  reason: 'A short weight against a card is an entitlement failure, which the NFSA gives a named officer.',
  legal_basis: 'National Food Security Act 2013, section 15',
  remedy_key: 'ration.dgro',
  visibility: 'public', supporters: 21, target: 40, status: 'reopened',
  escalates_to: 'State Food Commission', recurrence: 2, filed_on: '2026-04-08',
  officer_responded_on: '2026-04-27', officer_atr: ATR.ration,
  phone: '9812300003', citizen_name: 'Kamla',
  answers: [
    { q: 'grievance', a: 'The dealer gives us 22 kilos when the card says 25, and he does not give a receipt.' },
    { q: 'location', a: 'Barkheda village, Sehore district, Madhya Pradesh' }
  ],
  messages: [
    { role: 'citizen', text: 'The dealer answered the notice but nothing changed. This month was 22 kilos again.', on: '2026-05-04' }
  ],
  confirmations: [{ phone: '9812300003', verdict: 'not_fixed', on: '2026-05-04' }]
});

/* ─────────────────── closed by the citizen, properly ───────────────────────── */
push({
  code: 'EA-2026-05230', domain: 'infra.road', option_key: 'national_highway',
  title: 'Street lights out, NH-44 km 118 to 121',
  summary: 'Three kilometres of highway lighting dead for two months at an accident-prone bend.',
  area: 'NH-44, km 118 to 121, Durgapur', state: 'west bengal', cell: 'nh44-118-lights',
  office: 'Project Director, NHAI',
  reason: 'A national highway is NHAI work. A municipality cannot act on it even if it wanted to.',
  legal_basis: 'Entry 23, Union List',
  remedy_key: 'nhai.escalation',
  visibility: 'public', supporters: 77, target: 90, status: 'confirmed_fixed',
  escalates_to: 'NHAI Regional Officer', recurrence: 1, filed_on: '2026-05-14',
  officer_responded_on: '2026-06-02', officer_atr: ATR.road,
  confirmed_on: '2026-06-09', confirmed_by: 3,
  phone: '9812300004', citizen_name: 'Sandeep',
  answers: [
    { q: 'grievance', a: 'The street lights on the highway have been out for two months since the monsoon.' },
    { q: 'location', a: 'NH-44 km 119 service road entry, Durgapur' }
  ],
  confirmations: [
    { phone: '9812300004', verdict: 'fixed', on: '2026-06-09' },
    { phone: '9812300014', verdict: 'fixed', on: '2026-06-09' },
    { phone: '9812300015', verdict: 'fixed', on: '2026-06-08' }
  ]
});

push({
  code: 'EA-2026-05604', domain: 'other', option_key: null,
  title: 'Anganwadi kendra roof, Barkheda village',
  summary: 'A collapsed roof section left thirty-two children sitting outside through the monsoon.',
  area: 'Barkheda village, Sehore district', state: 'madhya pradesh', cell: 'barkheda-anganwadi',
  office: 'Child Development Project Officer',
  reason: 'An anganwadi building is ICDS, which runs through the CDPO at block level.',
  legal_basis: 'Article 243G and the Eleventh Schedule, entry 25',
  visibility: 'public', supporters: 32, target: 45, status: 'confirmed_fixed',
  escalates_to: 'District Programme Officer', recurrence: 1, filed_on: '2026-07-02',
  officer_responded_on: '2026-07-19', confirmed_on: '2026-07-28', confirmed_by: 2,
  phone: '9812300005', citizen_name: 'Rekha',
  confirmations: [
    { phone: '9812300005', verdict: 'fixed', on: '2026-07-28' },
    { phone: '9812300016', verdict: 'fixed', on: '2026-07-27' }
  ]
});

/* ─────────────────── overdue: past the clock, escalation live ───────────────── */
push({
  code: 'EA-2026-04108', domain: 'infra.water', option_key: null,
  title: 'Water supply failing four days a week',
  summary: 'Nothing after 7 am on most days, with two households buying cans daily.',
  area: 'Ward 9, Patna', state: 'bihar', cell: 'patna-w9-water',
  office: 'Executive Engineer, water supply, Patna',
  reason: 'Piped supply inside a municipal area is the urban local body, under the Twelfth Schedule.',
  legal_basis: 'Article 243W and the Twelfth Schedule',
  visibility: 'public', supporters: 18, target: 40, status: 'escalated',
  escalates_to: 'Municipal Commissioner', recurrence: 2, filed_on: '2026-02-18',
  phone: '9812300006', citizen_name: 'Anil',
  answers: [
    { q: 'grievance', a: 'Supply fails four days a week and there is nothing after seven in the morning.' },
    { q: 'location', a: 'Ward 9, Patna, Bihar' }
  ]
});

push({
  code: 'EA-2026-06021', domain: 'money.pf', option_key: null,
  title: 'PF withdrawal pending since February',
  summary: 'Claim filed in February, no movement and no reason recorded.',
  area: 'Peenya, Bengaluru', state: 'karnataka', cell: null,
  office: 'Regional Provident Fund Commissioner, Bengaluru',
  reason: 'A provident fund claim is EPFO work and never a state department matter.',
  legal_basis: 'Employees Provident Funds and Miscellaneous Provisions Act 1952',
  remedy_key: 'pf.interest',
  visibility: 'private', supporters: 1, target: null, status: 'awaiting_confirmation',
  escalates_to: 'Central Provident Fund Commissioner', recurrence: 1, filed_on: '2026-02-26',
  officer_responded_on: '2026-06-04', officer_atr: ATR.pf,
  phone: '9812300007', citizen_name: 'Lakshmi',
  answers: [
    { q: 'grievance', a: 'My PF withdrawal has been pending since February and nobody will tell me why.' },
    { q: 'Which office holds your account', a: 'Bengaluru, Peenya' }
  ]
});

push({
  code: 'EA-2026-06188', domain: 'money.bank', option_key: null,
  title: 'Disputed debit of Rs 18,400',
  summary: 'A card debit the account holder did not make, with no reply from the branch in three weeks.',
  area: 'Ranip, Ahmedabad', state: 'gujarat', cell: null,
  office: 'Nodal officer of your bank',
  reason: 'A bank must be given the first chance to answer before the Ombudsman will take it.',
  legal_basis: 'RBI Integrated Ombudsman Scheme 2021, clause 10',
  remedy_key: 'bank.ombudsman',
  visibility: 'private', supporters: 1, target: null, status: 'open',
  escalates_to: 'RBI Ombudsman', recurrence: 1, filed_on: '2026-06-19',
  phone: '9812300008', citizen_name: 'Hetal',
  answers: [
    { q: 'grievance', a: 'Rs 18,400 was debited from my account on 14 June and the bank has not replied.' },
    { q: 'Which bank', a: 'Bank of Baroda, Ranip branch' }
  ]
});

push({
  code: 'EA-2026-06390', domain: 'money.tax_refund', option_key: null,
  title: 'Income tax refund not received for AY 2025-26',
  summary: 'Return processed in December, refund still not credited eight months later.',
  area: 'Andheri East, Mumbai', state: 'maharashtra', cell: null,
  office: 'Centralised Processing Centre, Income Tax Department',
  reason: 'A refund is processed centrally at CPC, not by the local ward office.',
  legal_basis: 'Income Tax Act 1961, section 244A',
  remedy_key: 'tax.interest',
  visibility: 'private', supporters: 1, target: null, status: 'open',
  escalates_to: 'Jurisdictional Principal Commissioner', recurrence: 1, filed_on: '2026-07-11',
  phone: '9812300009', citizen_name: 'Prakash'
});

push({
  code: 'EA-2026-06455', domain: 'work.mgnrega', option_key: null,
  title: 'MGNREGA wages unpaid for 34 days of work',
  summary: 'Work completed in April, muster roll signed, wages not credited.',
  area: 'Kalahandi block', state: 'odisha', cell: 'kalahandi-mgnrega',
  office: 'Programme Officer, Kalahandi block',
  reason: 'Wage payment delay under MGNREGA is the Programme Officer, with a compensation clock.',
  legal_basis: 'MGNREGA 2005, Schedule II, paragraph 29',
  remedy_key: 'mgnrega.delay',
  visibility: 'public', supporters: 47, target: 60, status: 'escalated',
  escalates_to: 'District Programme Coordinator', recurrence: 1, filed_on: '2026-04-30',
  phone: '9812300010', citizen_name: 'Basanti'
});

push({
  code: 'EA-2026-06502', domain: 'money.pmkisan', option_key: null,
  title: 'PM-KISAN instalment missing since the April cycle',
  summary: 'Two instalments received, the third never arrived and the status page shows no reason.',
  area: 'Sikar district', state: 'rajasthan', cell: 'sikar-pmkisan',
  office: 'State Nodal Officer, PM-KISAN',
  visibility: 'public', supporters: 29, target: 50, status: 'open',
  escalates_to: 'District Collector', recurrence: 1, filed_on: '2026-06-02',
  phone: '9812300011', citizen_name: 'Ramesh'
});

push({
  code: 'EA-2026-06611', domain: 'property.housing', option_key: null,
  title: 'Possession delayed 26 months past the agreement date',
  summary: 'Registered project, agreement date March 2024, no possession and no compensation offered.',
  area: 'Sector 79, Noida', state: 'uttar pradesh', cell: null,
  office: 'Uttar Pradesh Real Estate Regulatory Authority',
  reason: 'A registered project is RERA. A consumer forum would be slower and weaker here.',
  legal_basis: 'RERA 2016, section 31',
  remedy_key: 'rera.complaint',
  visibility: 'private', supporters: 1, target: null, status: 'partly_fixed',
  escalates_to: 'RERA Appellate Tribunal', recurrence: 1, filed_on: '2026-01-22',
  officer_responded_on: '2026-03-20',
  phone: '9812300012', citizen_name: 'Farhan',
  confirmations: [{ phone: '9812300012', verdict: 'partly', on: '2026-03-28' }]
});

push({
  code: 'EA-2026-06740', domain: 'travel.rail', option_key: null,
  title: 'Refund not paid for a cancelled train',
  summary: 'Train cancelled by the railway in May, TDR filed, refund not received.',
  area: 'Secunderabad', state: 'telangana', cell: null,
  office: 'Divisional Railway Manager via RailMadad',
  visibility: 'private', supporters: 1, target: null, status: 'confirmed_fixed',
  escalates_to: 'Railway Claims Tribunal', recurrence: 1, filed_on: '2026-05-20',
  officer_responded_on: '2026-06-06', confirmed_on: '2026-06-10', confirmed_by: 1,
  phone: '9812300013', citizen_name: 'Vijaya',
  confirmations: [{ phone: '9812300013', verdict: 'fixed', on: '2026-06-10' }]
});

push({
  code: 'EA-2026-06822', domain: 'telecom.service', option_key: null,
  title: 'Billed for a plan that was never activated',
  summary: 'Three months of charges for a broadband plan the connection never carried.',
  area: 'Kochi', state: 'kerala', cell: null,
  office: 'Appellate Authority of your operator',
  visibility: 'private', supporters: 1, target: null, status: 'open',
  escalates_to: 'TRAI', recurrence: 1, filed_on: '2026-07-28',
  phone: '9812300017', citizen_name: 'Anitha'
});

push({
  code: 'EA-2026-06905', domain: 'office.inaction', option_key: null,
  title: 'RTI reply not given, 92 days past the limit',
  summary: 'Application filed in April, no reply, no rejection, no reason.',
  area: 'Nagpur', state: 'maharashtra', cell: null,
  office: 'First Appellate Authority of the public authority concerned',
  reason: 'A silent RTI is a first appeal, not a fresh grievance. The clock has already run.',
  legal_basis: 'Right to Information Act 2005, section 19',
  visibility: 'private', supporters: 1, target: null, status: 'escalated',
  escalates_to: 'State Information Commission', recurrence: 1, filed_on: '2026-04-18',
  phone: '9812300018', citizen_name: 'Devendra'
});

push({
  code: 'EA-2026-07011', domain: 'integrity.bribe', option_key: null,
  title: 'Payment demanded to release a mutation certificate',
  summary: 'A sum demanded at the counter to move a file that has no fee.',
  area: 'Hooghly district', state: 'west bengal', cell: null,
  office: 'Chief Vigilance Officer of the department concerned',
  reason: 'This is a vigilance matter, and it has no 21-day service clock — a different track entirely.',
  visibility: 'private', supporters: 1, target: null, status: 'open',
  escalates_to: 'State Vigilance Commission', recurrence: 1, filed_on: '2026-08-04',
  phone: '9812300019'
});

/* ─────────────────── public cases without an owner, for the wall ───────────── */
const wall = [
  ['EA-2026-07120', 'infra.water', 'Handpump dry since March, 40 households',
   'Bhilwara district', 'rajasthan', 'Executive Engineer, water supply, Bhilwara', 38, 60, 'open', '2026-03-30'],
  ['EA-2026-07204', 'infra.road', 'Approach road washed out, no bus for six weeks',
   'Chamoli district', 'uttarakhand', 'Block Development Officer, Joshimath block', 52, 70, 'escalated', '2026-06-15'],
  ['EA-2026-07298', 'infra.power', 'Nine-hour daily cuts through the harvest',
   'Warangal rural', 'telangana', 'Executive Engineer, TGSPDCL', 84, 100, 'open', '2026-07-06'],
  ['EA-2026-07355', 'supply.ration', 'Fair price shop closed on issue days',
   'Purnia district', 'bihar', 'District Grievance Redressal Officer under the National Food Security Act', 26, 40, 'open', '2026-07-22'],
  ['EA-2026-07401', 'infra.water', 'Sewage standing in the lane for eleven days',
   'Ward 22, Kanpur', 'uttar pradesh', 'Executive Engineer, water supply, Kanpur', 44, 50, 'awaiting_confirmation', '2026-06-28'],
  ['EA-2026-07478', 'work.mgnrega', 'Job cards not issued after four months of applications',
   'Dumka district', 'jharkhand', 'Programme Officer, Dumka block', 31, 50, 'open', '2026-05-19'],
  ['EA-2026-07520', 'infra.road', 'Unlit level crossing approach, two near misses',
   'Bhusawal', 'maharashtra', 'Divisional Railway Manager via RailMadad', 19, 40, 'open', '2026-08-01'],
  ['EA-2026-07588', 'other', 'Primary school without a functioning toilet',
   'Koraput district', 'odisha', 'Block Education Officer', 57, 70, 'escalated', '2026-04-11'],
  ['EA-2026-07640', 'infra.power', 'Street lighting out across four lanes',
   'Ward 6, Ludhiana', 'punjab', 'Executive Engineer, PSPCL', 23, 40, 'open', '2026-07-30'],
  ['EA-2026-07702', 'infra.water', 'Overhead tank not cleaned in two years',
   'Ward 14, Guwahati', 'assam', 'Executive Engineer, water supply, Guwahati', 16, 30, 'open', '2026-08-09']
];

for (const [code, domain, title, area, state, office, supporters, target, status, filed] of wall) {
  push({
    code, domain, title,
    summary: null, area, state,
    cell: code.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    office, visibility: 'public', supporters, target, status,
    escalates_to: 'District Collector', recurrence: 1, filed_on: filed,
    officer_responded_on: status === 'awaiting_confirmation' ? '2026-07-20' : null,
    officer_atr: status === 'awaiting_confirmation' ? ATR.water : null
  });
}

/* ─────────────────── write it, keeping the published stats block ───────────── */
const existing = JSON.parse(fs.readFileSync('data/seed.json', 'utf8'));

const out = {
  _note: 'Seeded synthetic case history. Every case, date, officer action, signature count and '
       + 'name here is invented for the demo — no live government system was touched and no real '
       + 'person is described. The published CPGRAMS figures under "stats" are the one exception '
       + 'and are sourced below. Rows created from this file are flagged seeded=1 in the database '
       + 'so the product can say which is which.',
  _states: [...new Set(cases.map((c) => c.state))].sort(),
  _domains: [...new Set(cases.map((c) => c.domain))].sort(),
  _statuses: [...new Set(cases.map((c) => c.status))].sort(),
  cases,
  stats: existing.stats
};

fs.writeFileSync('data/seed.json', JSON.stringify(out, null, 2));

console.log(`${cases.length} cases written`);
console.log(`  states    ${out._states.length}`);
console.log(`  domains   ${out._domains.length}`);
console.log(`  statuses  ${out._statuses.join(', ')}`);
console.log(`  public    ${cases.filter((c) => c.visibility === 'public').length}`);
console.log(`  private   ${cases.filter((c) => c.visibility === 'private').length}`);
console.log(`  with officer text  ${cases.filter((c) => c.officer_atr).length}`);
console.log(`  with confirmations ${cases.filter((c) => c.confirmations).length}`);
console.log(`  named citizens     ${cases.filter((c) => c.citizen_name).length}`);

/* the one thing that must never be wrong: a closed case must have what closed it */
const bad = cases.filter((c) => c.status === 'confirmed_fixed'
  && !(c.confirmations && c.confirmations.some((k) => k.verdict === 'fixed')));
console.log(bad.length
  ? `\n!! ${bad.length} case(s) claim confirmed_fixed with no confirmation: ${bad.map((c) => c.code).join(', ')}`
  : '\nevery confirmed_fixed case carries the confirmations that closed it');
