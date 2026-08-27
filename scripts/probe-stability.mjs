/* Measure whether the process aborts actually stopped.
 *
 * better-sqlite3 was aborting the Node process on Vercel with SIGABRT when a Statement destructor
 * ran after the environment had gone. Preparing five statements instead of a hundred and thirty
 * should reduce that, and "should" is not a measurement — the whole point of this project is not
 * publishing a number without checking what is behind it.
 *
 * So: every page and every important endpoint, several times each, recording status and latency.
 * A cold start is expected to be slow; a 500 is not, and a body that arrives with a 500 status is
 * the specific signature of the instance dying mid-response. */

const BASE = process.env.BASE || 'https://ek-awaaz.vercel.app';
const ROUNDS = Number(process.env.ROUNDS || 3);

const GETS = ['/', '/report', '/my-cases', '/near-you', '/api/health', '/api/cases'];
const results = [];

async function hit(path) {
  const t0 = Date.now();
  try {
    const res = await fetch(BASE + path, { redirect: 'manual' });
    const body = await res.text();
    return { path, status: res.status, ms: Date.now() - t0, bytes: body.length,
             bodyLooksRight: body.length > 400 };
  } catch (err) {
    return { path, status: 0, ms: Date.now() - t0, bytes: 0, bodyLooksRight: false, err: err.message };
  }
}

for (let round = 1; round <= ROUNDS; round++) {
  for (const p of GETS) results.push({ round, ...(await hit(p)) });
}

/* ── report ─────────────────────────────────────────────────────────────── */
const byPath = new Map();
for (const r of results) {
  if (!byPath.has(r.path)) byPath.set(r.path, []);
  byPath.get(r.path).push(r);
}

console.log(`\n${BASE}   ${ROUNDS} rounds\n`);
console.log('  path            ok   fail   slowest   statuses');
let bad = 0;
for (const [path, rs] of byPath) {
  const ok = rs.filter((r) => r.status >= 200 && r.status < 400).length;
  const fail = rs.length - ok;
  bad += fail;
  const slowest = Math.max(...rs.map((r) => r.ms));
  const codes = [...new Set(rs.map((r) => r.status))].join(',');
  console.log(`  ${path.padEnd(15)} ${String(ok).padStart(2)}   ${String(fail).padStart(4)}   ${String(slowest + 'ms').padStart(7)}   ${codes}`);
}

/* the signature of an instance dying mid-response: a real body under an error status */
const diedMidResponse = results.filter((r) => r.status >= 500 && r.bodyLooksRight);
console.log(`\n  requests: ${results.length}   failures: ${bad}`);
if (diedMidResponse.length) {
  console.log(`  ${diedMidResponse.length} responses carried a full body under a 5xx —`);
  console.log('  that is the instance aborting after the page was written, i.e. the SIGABRT is not gone.');
} else if (bad === 0) {
  console.log('  no failures: every page and endpoint answered on every round.');
} else {
  console.log('  failures present but none carried a body, so they read as cold starts or');
  console.log('  rate limiting rather than the abort.');
}
process.exit(bad ? 1 : 0);
