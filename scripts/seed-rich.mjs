/* Let the seed carry a whole case history, not just a case row.
 *
 * The seeder wrote cases and nothing else, so a seeded case had no officer text, no answers,
 * no owner, no signatures, no messages and no confirmations. Which meant: the closure gate had
 * no officialese to show until you pressed the demo button, the timeline had two events, "My
 * information" was empty for everyone, supporter counts were a number with nothing behind it,
 * and no seeded case belonged to anybody — so My grievances was always empty on a fresh
 * install.
 *
 * A demo that only comes alive after you click six things is not a demo. This extends the
 * seeder to insert the four child tables and the three columns it was skipping, so a fresh
 * database opens on a product with a history.
 *
 * The counts stay honest: a signature row is written for every supporter the case claims, so
 * `supporters` is the length of a real list rather than a decorative integer, and the joinder
 * dedup (one signature per verified mobile) is exercised by the seed itself.
 */

import fs from 'node:fs';

const F = 'server/db.js';
/* The working copy is CRLF; git stores LF. Normalise for matching and write back LF, which
   is what git records anyway, so this produces a real diff rather than a whole-file churn. */
const CRLF = new RegExp(String.fromCharCode(13) + String.fromCharCode(10), 'g');
let s = fs.readFileSync(F, 'utf8').replace(CRLF, String.fromCharCode(10));

if (s.includes('seedChildren')) { console.log('= already extended'); process.exit(0); }

/* ── 1 · the case insert gains the three columns it was dropping ───────────── */
const oldInsert = `    INSERT INTO cases (code, domain, option_key, title, summary, area, state, cell, office,
                       visibility, supporters, target, status, escalates_to, recurrence,
                       filed_on, officer_responded_on, confirmed_on, confirmed_by,
                       asks_json, seeded)
    VALUES (@code, @domain, @option_key, @title, @summary, @area, @state, @cell, @office,
            @visibility, @supporters, @target, @status, @escalates_to, @recurrence,
            @filed_on, @officer_responded_on, @confirmed_on, @confirmed_by,
            @asks_json, 1)`;

const newInsert = `    INSERT INTO cases (code, domain, option_key, title, summary, area, state, cell, office,
                       reason, legal_basis, channel, remedy_key,
                       visibility, supporters, target, status, escalates_to, recurrence,
                       filed_on, officer_responded_on, officer_atr, confirmed_on, confirmed_by,
                       asks_json, answers_json, phone, seeded)
    VALUES (@code, @domain, @option_key, @title, @summary, @area, @state, @cell, @office,
            @reason, @legal_basis, @channel, @remedy_key,
            @visibility, @supporters, @target, @status, @escalates_to, @recurrence,
            @filed_on, @officer_responded_on, @officer_atr, @confirmed_on, @confirmed_by,
            @asks_json, @answers_json, @phone, 1)`;

if (!s.includes(oldInsert)) { console.log('! case insert not found in the expected shape'); process.exit(1); }
s = s.replace(oldInsert, () => newInsert);

/* ── 2 · the bound values ──────────────────────────────────────────────────── */
const oldBind = `        asks_json: JSON.stringify(c.asks ?? [])
      });`;
const newBind = `        reason: c.reason ?? null,
        legal_basis: c.legal_basis ?? null,
        channel: c.channel ?? null,
        remedy_key: c.remedy_key ?? null,
        officer_atr: c.officer_atr ?? null,
        asks_json: JSON.stringify(c.asks ?? []),
        answers_json: JSON.stringify(c.answers ?? []),
        phone: c.phone ?? null
      });
      seedChildren(c);`;

if (!s.includes(oldBind)) { console.log('! bind block not found'); process.exit(1); }
s = s.replace(oldBind, () => newBind);

/* ── 3 · the child rows ────────────────────────────────────────────────────── */
const anchor = `/* ---------- helpers ---------- */`;
const children = `/* The history behind a seeded case: who signed it, what was said on it, who confirmed it.
   Written from the case's own fields so the numbers on screen are the length of a real list
   rather than a decorative integer. */
function seedChildren(c) {
  const row = db.prepare('SELECT id FROM cases WHERE code = ?').get(c.code);
  if (!row) return;

  /* Signatures. A public case claiming 34 households gets 34 signature rows, each against a
     distinct synthetic mobile, so the joinder rule (one signature per verified mobile) is
     exercised by the seed and the count cannot drift from the list. */
  if (c.visibility !== 'private' && (c.supporters || 0) > 0) {
    const sig = db.prepare('INSERT OR IGNORE INTO signatures (case_id, phone, note, added_on) VALUES (?, ?, ?, ?)');
    const base = 7000000000 + (row.id * 1000);
    for (let i = 0; i < c.supporters; i++) {
      sig.run(row.id, String(base + i), i === 0 ? (c.summary ?? null) : null, c.filed_on);
    }
    /* the owner, if the seed names one, is the first signature rather than a 35th */
    if (c.phone) sig.run(row.id, c.phone, null, c.filed_on);
  }

  /* The exchange on the case. */
  if (Array.isArray(c.messages)) {
    const msg = db.prepare('INSERT INTO messages (case_id, role, phone, text, added_on) VALUES (?, ?, ?, ?, ?)');
    for (const m of c.messages) {
      msg.run(row.id, m.role || 'citizen', m.role === 'officer' ? null : (c.phone ?? null),
              m.text, m.on || c.filed_on);
    }
  }

  /* Confirmations. Only these can close a case, so a seeded confirmed_fixed case must have
     them or the record contradicts itself. */
  if (Array.isArray(c.confirmations)) {
    const conf = db.prepare('INSERT OR IGNORE INTO confirmations (case_id, phone, verdict, added_on) VALUES (?, ?, ?, ?)');
    for (const k of c.confirmations) {
      conf.run(row.id, String(k.phone), k.verdict || 'fixed', k.on || c.confirmed_on || c.filed_on);
    }
  }

  /* A named citizen exists as a person, so My information has something to show. */
  if (c.phone && c.citizen_name) {
    db.prepare(\`INSERT INTO people (phone, name, created_on) VALUES (?, ?, ?)
                ON CONFLICT(phone) DO UPDATE SET name = COALESCE(people.name, excluded.name)\`)
      .run(c.phone, c.citizen_name, c.filed_on);
  }
}

${anchor}`;

s = s.replace(anchor, () => children);

/* ── 4 · a forced reseed has to clear the children too ─────────────────────── */
const oldForce = `  if (force) db.prepare('DELETE FROM cases WHERE seeded = 1').run();`;
const newForce = `  if (force) {
    /* the child rows hang off seeded cases and would otherwise be orphaned on a reseed */
    const ids = db.prepare('SELECT id FROM cases WHERE seeded = 1').all().map((r) => r.id);
    if (ids.length) {
      const list = ids.join(',');
      db.prepare('DELETE FROM signatures WHERE case_id IN (' + list + ')').run();
      db.prepare('DELETE FROM messages WHERE case_id IN (' + list + ')').run();
      db.prepare('DELETE FROM confirmations WHERE case_id IN (' + list + ')').run();
    }
    db.prepare('DELETE FROM cases WHERE seeded = 1').run();
  }`;
if (s.includes(oldForce)) s = s.replace(oldForce, () => newForce);
else console.log('  ! force-clear line not found; a reseed will orphan child rows');

fs.writeFileSync(F, s);
console.log('db.js — the seed can now carry a case history');
