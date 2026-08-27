/* A remedy scoped to one state must not be offered as available in another.

   The pothole compensation remedy is Maharashtra law (Bombay HC, October 2025), gated on a
   death or an injury, and marked built:false. Asked from a Bihar case it must come back
   qualified — the condition or the state limit named in the same breath — and it must never
   quote the ₹6 lakh / ₹50,000-₹2.5 lakh figures as though they applied there. */

const BASE = process.env.BASE || 'http://localhost:3000';
const OTP = '123456';

const post = (p, body) => fetch(BASE + p, {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
}).then((r) => r.json().then((j) => ({ status: r.status, ...j })));

let failures = 0;
const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(58)} ${ok ? '' : `got ${JSON.stringify(got)}`}`);
};

async function fileIn(state, phone) {
  await post('/api/otp/send', { phone });
  const made = await post('/api/cases', {
    phone, otp: OTP, domain: 'infra.road', optionKey: 'village_road',
    title: 'Potholes on the village road', summary: 'A stretch is broken and unsafe after rain.',
    area: 'Ward 4', state, cell: 'scope-' + state, visibility: 'private'
  });
  return made.case;
}

const Q = 'What compensation can I claim if this road injures someone?';

for (const [state, phone] of [['Bihar', '9800000101'], ['Maharashtra', '9800000102']]) {
  const c = await fileIn(state, phone);
  if (!c) { console.log('could not file in ' + state); process.exit(1); }
  const res = await post(`/api/cases/${c.code}/ask`, { question: Q });
  const answer = String(res.answer || '');

  console.log(`\n${state}  (${c.code})`);
  console.log('  A: ' + answer.slice(0, 260));

  const quotesAmount = /6\s*lakh|50,?000|2\.5\s*lakh/i.test(answer);
  const qualified = /only|if|condition|not (?:fixed|settled)|maharashtra|kerala|does not|injur/i.test(answer);

  check('the answer is qualified, not a flat promise', qualified, true);
  if (state === 'Bihar') {
    check('does NOT quote Maharashtra amounts as available in Bihar',
          quotesAmount && !/maharashtra|not fixed|not settled|only/i.test(answer), false);
  }
  check('grounded flag holds', res.grounded, true);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
