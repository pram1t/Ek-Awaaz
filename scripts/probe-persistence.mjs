/* Measure how long a filed case actually survives on a serverless host.

   The known limitation is that each instance holds its own in-memory database, so a case
   filed against one instance is invisible to another. The question that matters for a demo
   is not whether that is true — it is how quickly it bites. A judge files a grievance, reads
   the route screen for a minute, then opens My grievances. If the case is gone by then the
   closure gate cannot be shown at all.

   So: file one case, then ask for it back at widening intervals and record the first miss.
   Run with BASE pointing at the deployment. */

const BASE = process.env.BASE || 'https://ek-awaaz.vercel.app';
const PHONE = '9800000077';
const WAITS = [0, 5, 15, 30, 60, 120, 240];   /* seconds between checks */

const post = (p, body) => fetch(BASE + p, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}).then((r) => r.json().then((j) => ({ status: r.status, ...j })));

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

await post('/api/otp/send', { phone: PHONE });
const made = await post('/api/cases', {
  phone: PHONE, otp: '123456',
  domain: 'infra.road', optionKey: 'village_road',
  title: 'Persistence probe', summary: 'Checking how long this survives.',
  area: 'Rajnagar Ward 4', state: 'Bihar', cell: 'probe-' + WAITS.length,
  visibility: 'private'
});

if (!made.case) { console.log('could not file:', made.error || made.status); process.exit(1); }
const code = made.case.code;
console.log(`filed ${code} at ${new Date().toISOString().slice(11, 19)}\n`);

let elapsed = 0;
let firstMiss = null;

for (const wait of WAITS) {
  if (wait) { await sleep(wait); elapsed += wait; }
  const res = await fetch(`${BASE}/api/cases/${code}`).then((r) => r.json().then((j) => ({ status: r.status, ...j })));
  const found = res.status === 200 && res.case;
  console.log(`  +${String(elapsed).padStart(4)}s   ${found ? 'still there' : 'GONE — a different instance answered'}`);
  if (!found && firstMiss === null) firstMiss = elapsed;
}

/* The seed data is compiled in, so it must survive regardless of which instance answers. */
const seed = await fetch(`${BASE}/api/cases`).then((r) => r.json());
console.log(`\nseeded public cases visible: ${(seed.cases || []).length}`);
console.log(firstMiss === null
  ? `\nthe case held for the full ${elapsed}s window`
  : `\nfirst miss at +${firstMiss}s — a filed case is not safe past that`);
