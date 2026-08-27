/* Check the demo data against the rules the product claims.
 *
 * A seed file is the easiest place in a project to tell a lie, because nothing fails when it
 * does. The counts look plausible, every screen fills up, and the one rule the whole thing
 * rests on — that only a citizen's confirmation closes a case — can be quietly contradicted by
 * a row that says confirmed_fixed with nothing behind it.
 *
 * So this asserts the things that would be embarrassing to be caught on:
 *   1. every closed case has the confirmation that closed it
 *   2. every supporter count is the length of a real signature list, not a typed-in number
 *   3. no case is signed twice by the same mobile, which is the joinder rule
 *   4. dates are ordered: filed, then the officer replied, then confirmed
 *   5. every routed domain and every status is represented, or the demo has blind spots
 */

import Database from 'better-sqlite3';

const db = new Database('data/ekawaaz.db', { readonly: true });
let fail = 0;
const ok = (cond, label, detail) => {
  if (!cond) fail++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
};

console.log('\ncontents');
const n = (sql) => db.prepare(sql).get().n;
console.log(`  cases ${n('SELECT COUNT(*) n FROM cases')} · signatures ${n('SELECT COUNT(*) n FROM signatures')}`
  + ` · messages ${n('SELECT COUNT(*) n FROM messages')} · confirmations ${n('SELECT COUNT(*) n FROM confirmations')}`
  + ` · people ${n('SELECT COUNT(*) n FROM people')}`);

/* ── 1 · a closed case must have what closed it ──────────────────────────── */
console.log('\nthe rule the product rests on');
const unclosed = db.prepare(`
  SELECT c.code FROM cases c
   WHERE c.status = 'confirmed_fixed'
     AND (SELECT COUNT(*) FROM confirmations k WHERE k.case_id = c.id AND k.verdict = 'fixed') = 0
`).all();
ok(unclosed.length === 0, 'every confirmed_fixed case carries a citizen confirmation',
   unclosed.length ? unclosed.map((r) => r.code).join(', ') : '');

const closedByOfficer = db.prepare(`
  SELECT code FROM cases WHERE officer_responded_on IS NOT NULL AND status = 'confirmed_fixed'
    AND confirmed_on IS NULL
`).all();
ok(closedByOfficer.length === 0, 'no case is closed without a confirmation date',
   closedByOfficer.map((r) => r.code).join(', '));

/* ── 2 · counts are real lists ───────────────────────────────────────────── */
console.log('\ncounts');
const short = db.prepare(`
  SELECT c.code, c.supporters, (SELECT COUNT(*) FROM signatures s WHERE s.case_id = c.id) AS sigs
    FROM cases c WHERE c.visibility != 'private'
`).all().filter((r) => r.sigs < r.supporters);
ok(short.length === 0, 'every public supporter count is backed by signature rows',
   short.map((r) => `${r.code} claims ${r.supporters} has ${r.sigs}`).join('; '));

const privateSigned = db.prepare(`
  SELECT c.code FROM cases c WHERE c.visibility = 'private'
    AND (SELECT COUNT(*) FROM signatures s WHERE s.case_id = c.id) > 1
`).all();
ok(privateSigned.length === 0, 'no private case has been signed by strangers',
   privateSigned.map((r) => r.code).join(', '));

/* ── 3 · one signature per mobile ────────────────────────────────────────── */
const doubled = db.prepare(`
  SELECT case_id, phone, COUNT(*) AS n FROM signatures GROUP BY case_id, phone HAVING n > 1
`).all();
ok(doubled.length === 0, 'no mobile has signed the same case twice', `${doubled.length} duplicates`);

/* ── 4 · the dates make sense ────────────────────────────────────────────── */
console.log('\nchronology');
const badReply = db.prepare(`
  SELECT code, filed_on, officer_responded_on FROM cases
   WHERE officer_responded_on IS NOT NULL AND officer_responded_on < filed_on
`).all();
ok(badReply.length === 0, 'no officer replied before the case was filed',
   badReply.map((r) => r.code).join(', '));

const badConfirm = db.prepare(`
  SELECT code FROM cases
   WHERE confirmed_on IS NOT NULL AND officer_responded_on IS NOT NULL
     AND confirmed_on < officer_responded_on
`).all();
ok(badConfirm.length === 0, 'no case was confirmed before the officer replied',
   badConfirm.map((r) => r.code).join(', '));

/* ── 5 · coverage ────────────────────────────────────────────────────────── */
console.log('\ncoverage');
const statuses = db.prepare('SELECT status, COUNT(*) n FROM cases GROUP BY status').all();
const want = ['open', 'escalated', 'awaiting_confirmation', 'confirmed_fixed', 'reopened', 'partly_fixed'];
const have = statuses.map((r) => r.status);
const missing = want.filter((s) => !have.includes(s));
ok(missing.length === 0, 'every case state a judge could look for is present',
   missing.length ? 'missing ' + missing.join(', ') : statuses.map((r) => `${r.status}:${r.n}`).join(' '));

const domains = db.prepare('SELECT COUNT(DISTINCT domain) n FROM cases').get().n;
ok(domains >= 12, `${domains} distinct domains represented`);
const states = db.prepare('SELECT COUNT(DISTINCT state) n FROM cases').get().n;
ok(states >= 10, `${states} distinct states represented`);

const joinable = db.prepare(`
  SELECT COUNT(*) n FROM cases WHERE visibility != 'private' AND status != 'confirmed_fixed'
`).get().n;
ok(joinable >= 8, `${joinable} cases a stranger can actually join`);

const nearTarget = db.prepare(`
  SELECT COUNT(*) n FROM cases WHERE target IS NOT NULL AND supporters >= target * 0.8
    AND status != 'confirmed_fixed'
`).get().n;
ok(nearTarget >= 1, `${nearTarget} case(s) close to escalation, where the joinder argument shows`);

const withAtr = db.prepare('SELECT COUNT(*) n FROM cases WHERE officer_atr IS NOT NULL').get().n;
ok(withAtr >= 3, `${withAtr} cases carry the officer's own words for the closure gate`);

console.log(fail ? `\n${fail} FAILED` : '\nthe demo data holds every rule the product claims');
process.exit(fail ? 1 : 0);
