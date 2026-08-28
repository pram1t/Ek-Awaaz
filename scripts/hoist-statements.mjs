/* Stop the process aborting mid-request.
 *
 * Production log, on a POST that returned 500:
 *
 *   node[4]: void node::RemoveEnvironmentCleanupHook(...) at ../src/api/hooks.cc:142
 *   Assertion failed: (env) != nullptr
 *   Statement::~Statement()  [better_sqlite3.node]
 *   Node.js process exited with signal: 6 (SIGABRT)
 *
 * Every better-sqlite3 Statement registers a cleanup hook on the Node environment, and its
 * destructor removes it. On a serverless instance the environment can already be gone by the time
 * the destructor runs; the assertion fails and the whole process aborts — taking whatever request
 * was in flight with it. That is why the failure is intermittent and why it presents as a 500 with
 * no application error behind it: there is no error, the process simply died.
 *
 * I fixed this once by hoisting the seed statements — 130 short-lived Statements per cold start
 * down to 5 — and measured 24 requests with zero failures. But that only covered seeding. Forty-five
 * other call sites still ran db.prepare() per request, so every query was still minting a Statement
 * and queueing another destructor. The earlier fix reduced the exposure; it did not remove it.
 *
 * This memoises every statement by its SQL text. Prepared once, held for the life of the process,
 * never collected — so no destructor runs while the environment is being torn down. Identical SQL,
 * identical API, and it is also simply faster: better-sqlite3 is explicit that reusing a prepared
 * statement is the intended pattern.
 */

import fs from 'node:fs';

const F = 'server/db.js';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('function P(sql)')) { console.log('= already applied'); process.exit(0); }

const before = (s.match(/db\.prepare\(/g) || []).length;

/* ── the memoiser, right after the database is opened ──────────────────────── */
const anchor = 'const db = new Database(DB_PATH);';
if (!s.includes(anchor)) { console.log('! could not find the Database constructor'); process.exit(1); }

const helper = anchor + `

/* Every prepared statement, kept for the life of the process.
 *
 * better-sqlite3 registers a Node environment cleanup hook per Statement and removes it in the
 * destructor. On serverless the environment can be gone before that runs — the assertion inside
 * RemoveEnvironmentCleanupHook fails and the process aborts with SIGABRT, killing the request that
 * happened to be in flight. It shows up as an intermittent 500 with no error behind it, because
 * there is no error: the process died.
 *
 * Preparing once and holding the reference means no Statement is ever collected, so no destructor
 * ever runs at teardown. Keyed on the SQL text, which is static at every call site here.
 */
const STMT = new Map();
function P(sql) {
  let prepared = STMT.get(sql);
  if (!prepared) { prepared = db.prepare(sql); STMT.set(sql, prepared); }
  return prepared;
}

export const statementCount = () => STMT.size;`;

s = s.replace(anchor, () => helper);

/* ── every call site goes through it ───────────────────────────────────────── */
/* seedStmt already memoises and holds its own map; leave its internal prepare alone. */
const lines = s.split('\n');
let swapped = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (!SEED_STMT[name]) SEED_STMT[name] = db.prepare(sql);')) continue;
  if (lines[i].includes('prepared = db.prepare(sql)')) continue;      /* P itself */
  if (!lines[i].includes('db.prepare(')) continue;
  const n = (lines[i].match(/db\.prepare\(/g) || []).length;
  lines[i] = lines[i].split('db.prepare(').join('P(');
  swapped += n;
}
s = lines.join('\n');

fs.writeFileSync(F, s);

const after = (s.match(/db\.prepare\(/g) || []).length;
console.log('  db.prepare call sites: ' + before + ' -> ' + after + '  (' + swapped + ' routed through the memoiser)');
console.log('  the two left are the memoiser itself and seedStmt, which already holds its own.');
