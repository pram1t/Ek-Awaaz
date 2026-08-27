/* Exercise the case record: the timeline, a citizen answering back, and the grounded Q&A.

   The assertion that matters most is the last group. "Ask about this case" is the one place a
   citizen asks an open question, so it is the one place an invented date does real damage.
   The tests below deliberately ask things the record cannot answer and require that the
   answer says so rather than guessing well. */

const BASE = process.env.BASE || 'http://localhost:3000';
const PHONE = '9800000088';
const OTP = '123456';

const post = (p, body) => fetch(BASE + p, {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
}).then((r) => r.json().then((j) => ({ status: r.status, ...j })));
const get = (p) => fetch(BASE + p).then((r) => r.json().then((j) => ({ status: r.status, ...j })));

let failures = 0;
function check(label, got, want) {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${ok ? got : `got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
}

await post('/api/otp/send', { phone: PHONE });
const made = await post('/api/cases', {
  phone: PHONE, otp: OTP, domain: 'infra.road', optionKey: 'village_road',
  title: 'Broken road near the school gate', summary: 'A 40 metre stretch washes out after rain.',
  area: 'Rajnagar Ward 4, Madhubani district, Bihar', state: 'Bihar', cell: 'timeline-test',
  visibility: 'private',
  asks: [{ q: 'Where exactly is this?' }],
  answers: [{ q: 'ask0', a: 'The 40 metres before the primary school gate' }]
});
if (!made.case) { console.log('could not file:', made.error); process.exit(1); }
const code = made.case.code;
console.log(`\ncase ${code}\n`);

/* ---- the timeline ---- */
console.log('timeline');
let t = await get(`/api/cases/${code}/timeline`);
check('returns events', Array.isArray(t.events) && t.events.length > 0, true);
check('opens with the citizen describing it', t.events[0].title, 'You described the problem');
check('names the office it was routed to', /Routed to /.test(t.events[1].title), true);
check('ends on what is happening now', t.events[t.events.length - 1].tone, 'current');
console.log('       ' + t.events.map((e) => e.title).join(' -> '));

/* ---- the officer replies, then the citizen answers back ---- */
console.log('\nanswering the office');
await post(`/api/cases/${code}/simulate-reply`, { language: 'en' });
let after = await get(`/api/cases/${code}`);
check('case is waiting on the citizen', after.case.status, 'awaiting_confirmation');

const reply = await post(`/api/cases/${code}/reply`, {
  phone: PHONE, otp: OTP,
  text: 'The stretch they repaired is not the stretch I reported. The school gate side is untouched.'
});
check('reply accepted', reply.status, 200);
check('CASE GOES BACK TO THE OFFICE, not left waiting on me', reply.case.status, 'open');

t = await get(`/api/cases/${code}/timeline`);
check('the answer is in the record', t.events.some((e) => e.title === 'You answered'), true);
check('the officer reply is in the record', t.events.some((e) => e.title === 'The office replied'), true);

const short = await post(`/api/cases/${code}/reply`, { phone: PHONE, otp: OTP, text: 'no' });
check('a one-word reply is refused', short.status, 400);
const noAuth = await post(`/api/cases/${code}/reply`, { text: 'Trying without a mobile number at all.' });
check('a reply without a mobile is refused', noAuth.status, 401);

/* ---- the grounded question ---- */
console.log('\nask about this case');
const answerable = await post(`/api/cases/${code}/ask`, { question: 'Which office is holding my case?' });
check('answers what the record holds', /block development officer/i.test(answerable.answer || ''), true);
console.log('       Q: Which office is holding my case?');
console.log('       A: ' + (answerable.answer || '').slice(0, 150));

const unanswerable = await post(`/api/cases/${code}/ask`, { question: 'What is the name of the junior engineer who will come, and on what date?' });
console.log('       Q: What is the name of the junior engineer, and on what date?');
console.log('       A: ' + (unanswerable.answer || '').slice(0, 190));
check('does not invent a date or a name', /only answer from what is on this case|does not|not on it|no record|not record/i.test(unanswerable.answer || ''), true);
check('grounded flag holds', unanswerable.grounded, true);

const compensation = await post(`/api/cases/${code}/ask`, { question: 'How much compensation will I get for my broken scooter axle?' });
console.log('       Q: How much compensation will I get?');
console.log('       A: ' + (compensation.answer || '').slice(0, 190));
check('does not invent a rupee figure', /₹\s?[\d,]+/.test(compensation.answer || ''), false);

const empty = await post(`/api/cases/${code}/ask`, { question: 'a' });
check('an empty question is refused', empty.status, 400);
const missing = await post('/api/cases/EA-9999-99999/ask', { question: 'Where is my case?' });
check('an unknown case is refused', missing.status, 404);

const h = await get('/api/health');
console.log(`\nspent $${h.budget.spentUsd} of $${h.budget.ceilingUsd} across ${h.budget.calls} calls`);
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
