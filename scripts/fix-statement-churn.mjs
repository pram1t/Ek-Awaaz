/* Stop creating and discarding prepared statements.
 *
 * Vercel's function logs show better-sqlite3 aborting the whole Node process:
 *
 *   node[4]: RemoveEnvironmentCleanupHook — Assertion failed: (env) != nullptr
 *   Statement::~Statement() [better_sqlite3.node]
 *   Node.js process exited with signal: 6 (SIGABRT)
 *
 * A Statement's destructor removes a cleanup hook from the Node environment. On a serverless
 * instance the environment can already be gone by the time that destructor runs, the assertion
 * fails, and the process aborts — taking any in-flight request with it. That is why the 500s were
 * intermittent and why the body sometimes arrived anyway: the page had been written before the
 * instance died.
 *
 * seedChildren() called db.prepare inside a per-case function, so a 26-case seed created and
 * abandoned about a hundred and thirty Statement objects on every cold start. Prepared once at
 * module scope and held for the life of the process, there are five, and they are referenced so
 * nothing collects them early.
 *
 * This reduces the exposure rather than removing it, and the commit says so. better-sqlite3 is a
 * native module with process-lifetime cleanup hooks and serverless is a runtime that tears
 * environments down constantly; that mismatch does not go away by preparing fewer statements. The
 * measurement after this decides whether the demo needs a persistent host.
 */

import fs from 'node:fs';

const F = 'server/db.js';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('SEED_STMT')) { console.log('= already applied'); process.exit(0); }

const start = s.indexOf('function seedChildren(c) {');
if (start < 0) { console.log('! seedChildren not found'); process.exit(1); }
/* the function ends at the next line that is a lone closing brace at column 0 */
const lines = s.slice(start).split('\n');
let end = -1;
for (let i = 1; i < lines.length; i++) { if (lines[i] === '}') { end = i; break; } }
if (end < 0) { console.log('! could not bound seedChildren'); process.exit(1); }
const oldFn = lines.slice(0, end + 1).join('\n');

const newFn = `/* Prepared once, held for the life of the process. Created inside the per-case call, these
   produced roughly a hundred and thirty Statement objects per cold start, and every one of them
   is a destructor that removes a cleanup hook from the Node environment. On a serverless instance
   that environment can be gone before the destructor runs; the assertion inside
   RemoveEnvironmentCleanupHook then fails and aborts the process, which is what the Vercel logs
   were showing. Five statements, referenced, is not a cure for that mismatch but it is a great
   deal less of it. */
const SEED_STMT = {};
function seedStmt(name, sql) {
  if (!SEED_STMT[name]) SEED_STMT[name] = db.prepare(sql);
  return SEED_STMT[name];
}

function seedChildren(c) {
  const row = seedStmt('findCase', 'SELECT id FROM cases WHERE code = ?').get(c.code);
  if (!row) return;

  /* Signatures. A public case claiming 34 households gets 34 signature rows, each against a
     distinct synthetic mobile, so the joinder rule is exercised by the seed itself and the count
     cannot drift from the list. */
  if (c.visibility !== 'private' && (c.supporters || 0) > 0) {
    const sig = seedStmt('sig',
      'INSERT OR IGNORE INTO signatures (case_id, phone, note, added_on) VALUES (?, ?, ?, ?)');
    const base = 7000000000 + (row.id * 1000);
    for (let i = 0; i < c.supporters; i++) {
      sig.run(row.id, String(base + i), i === 0 ? (c.summary ?? null) : null, c.filed_on);
    }
    if (c.phone) sig.run(row.id, c.phone, null, c.filed_on);
  }

  if (Array.isArray(c.messages)) {
    const msg = seedStmt('msg',
      'INSERT INTO messages (case_id, role, phone, text, added_on) VALUES (?, ?, ?, ?, ?)');
    for (const m of c.messages) {
      msg.run(row.id, m.role || 'citizen', m.role === 'officer' ? null : (c.phone ?? null),
              m.text, m.on || c.filed_on);
    }
  }

  /* Only a confirmation can close a case, so a seeded confirmed_fixed case must carry them or
     the record contradicts the one rule the product rests on. */
  if (Array.isArray(c.confirmations)) {
    const conf = seedStmt('conf',
      'INSERT OR IGNORE INTO confirmations (case_id, phone, verdict, added_on) VALUES (?, ?, ?, ?)');
    for (const k of c.confirmations) {
      conf.run(row.id, String(k.phone), k.verdict || 'fixed', k.on || c.confirmed_on || c.filed_on);
    }
  }

  if (c.phone && c.citizen_name) {
    seedStmt('person', \`INSERT INTO people (phone, name, created_on) VALUES (?, ?, ?)
                        ON CONFLICT(phone) DO UPDATE SET name = COALESCE(people.name, excluded.name)\`)
      .run(c.phone, c.citizen_name, c.filed_on);
  }
}`;

s = s.replace(oldFn, () => newFn);
fs.writeFileSync(F, s);
console.log('db.js — seed statements prepared once and held');

/* count what is left */
const after = fs.readFileSync(F, 'utf8');
const inLoops = (after.slice(after.indexOf('function seedChildren')).match(/db\.prepare/g) || []).length;
console.log(`  db.prepare calls inside seedChildren: ${inLoops} (was 5 per case)`);
