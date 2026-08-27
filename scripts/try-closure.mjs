/* Prove the closure gate end to end, against the running server.

   The point of the test is not that the endpoints respond. It is that the ONLY path to
   confirmed_fixed runs through a citizen's verified mobile — so it checks the negative too:
   after the officer has filed a report saying "disposed of", the case must still not be
   closed. If that assertion ever passes silently, the product's central claim is broken. */

const BASE = process.env.BASE || 'http://localhost:3000';
const PHONE = '9800000042';
const OTHER = '9800000043';
const OTP = '123456';

const post = (p, body) => fetch(BASE + p, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
}).then((r) => r.json().then((j) => ({ status: r.status, ...j })));

let failures = 0;
function check(label, got, want) {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(52)} ${ok ? got : `got ${got}, wanted ${want}`}`);
}

async function file(visibility) {
  await post('/api/otp/send', { phone: PHONE });
  const made = await post('/api/cases', {
    phone: PHONE, otp: OTP,
    domain: 'infra.road', optionKey: 'village_road',
    title: 'Closure gate test', summary: 'A test case.',
    area: 'Rajnagar Ward 4', state: 'Bihar', cell: 'test-' + visibility,
    visibility
  });
  if (!made.case) { console.log('  could not file:', made.error); process.exit(1); }
  return made.case;
}

/* ---- 1. a private case: the officer replies, and it is still not closed ---- */
console.log('\nprivate case — officer reports "disposed of"');
const priv = await file('private');
check('filed as', priv.status, 'open');

const reply = await post(`/api/cases/${priv.code}/simulate-reply`, { language: 'en' });
check('officer report contains "disposed of"', /disposed of/i.test(reply.atr || ''), true);
check('plain rewrite came from the model, not the fallback', reply.aiSource, 'model');
check('plain rewrite is four sentences', Array.isArray(reply.plain) && reply.plain.length, 4);
check('THE CASE IS STILL NOT CLOSED', reply.case.status, 'awaiting_confirmation');

const yes = await post(`/api/cases/${priv.code}/confirm`, { phone: PHONE, verdict: 'fixed' });
check('citizen says fixed -> closed', yes.case.status, 'confirmed_fixed');

/* ---- 2. "not fixed" reopens the same case, history intact ---- */
console.log('\nprivate case — citizen says not fixed');
const p2 = await file('private');
await post(`/api/cases/${p2.code}/simulate-reply`, { language: 'en' });
const no = await post(`/api/cases/${p2.code}/confirm`, { phone: PHONE, verdict: 'not_fixed' });
check('reopens', no.case.status, 'reopened');
check('same case number', no.case.code, p2.code);
check('recurrence incremented', no.case.recurrence > (p2.recurrence || 0), true);

/* ---- 3. a public case needs a second voice ---- */
console.log('\npublic case — one signature is not enough');
const pub = await file('public');
await post(`/api/cases/${pub.code}/simulate-reply`, { language: 'en' });
const one = await post(`/api/cases/${pub.code}/confirm`, { phone: PHONE, verdict: 'fixed' });
check('one confirmation does not close it', one.case.status, 'awaiting_confirmation');
check('needs a second', one.needed, 2);
const two = await post(`/api/cases/${pub.code}/confirm`, { phone: OTHER, verdict: 'fixed' });
check('second confirmation closes it', two.case.status, 'confirmed_fixed');
check('records how many confirmed', two.confirmations, 2);

/* ---- 4. the gate refuses what it should ---- */
console.log('\nrefusals');
const noPhone = await post(`/api/cases/${priv.code}/confirm`, { verdict: 'fixed' });
check('confirm without a mobile is refused', noPhone.status, 401);
const junk = await post(`/api/cases/${priv.code}/confirm`, { phone: PHONE, verdict: 'closed' });
check('an invented verdict is refused', junk.status, 400);

const health = await (await fetch(BASE + '/api/health')).json();
console.log(`\nspent $${health.budget.spentUsd} of $${health.budget.ceilingUsd} across ${health.budget.calls} calls`);
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
