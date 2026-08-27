/* A remedy is not a fact until it applies.

   With the remedy ladder passed into "ask about this case", a Bihar road case was answered
   with the Bombay High Court's compensation scale — ₹6 lakh for a death, ₹50,000 to ₹2.5 lakh
   for injury — as though it were simply available. It is not. That remedy carries a gate (it
   arises only where the road caused a death or an injury) and a scope (Maharashtra; Kerala has
   held similarly; elsewhere the Article 21 reasoning is available but the amounts are not
   fixed). It is also marked built:false, meaning this prototype does not implement it.

   The remedies file already recorded all three qualifications. Passing the title, forum and
   teeth while dropping the gate and the scope turned a carefully hedged legal note into a
   promise. A citizen acting on that would arrive at the wrong forum expecting a number that
   does not apply in their state — worse than being told nothing.

   So the qualifications travel with the remedy, the case's own state is passed alongside the
   scope so the two can be compared, and the prompt is told to state the condition in the same
   breath as the remedy. Never the remedy alone. */

import fs from 'node:fs';

const F = 'server/ai.js';
let s = fs.readFileSync(F, 'utf8');
let n = 0;

const oldFn = `function remedyLines(c) {
  const r = c.remedyKey && remedies && remedies.remedies && remedies.remedies[c.remedyKey];
  if (!r) return [];
  return [
    ['Remedy available if the office misses the deadline', r.title],
    ['Where that remedy is heard', r.forum],
    ['What that forum can order', r.teeth],
    ['Time limit on that remedy', r.clock],
    ['Provision it comes from', r.provision],
    ['Caveat on that remedy', r.caveat || null]
  ];
}`;

const newFn = `function remedyLines(c) {
  const r = c.remedyKey && remedies && remedies.remedies && remedies.remedies[c.remedyKey];
  if (!r) return [];

  /* A remedy scoped to one state is not available in another just because it is on file. */
  const scope = r.scope || null;
  const state = String(c.state || '').toLowerCase();
  const settledHere = scope ? new RegExp('\\\\b' + state.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + '\\\\b', 'i').test(scope) : true;

  /* And one behind a gate is conditional until the condition is met. */
  const gate = r.gate && r.gate.type === 'flag' ? 'only where ' + r.gate.field + ' applies to this case'
             : r.gate && r.gate.type === 'days_since' ? 'only after ' + r.gate.days + ' days have passed'
             : null;

  return [
    ['Remedy on file for this kind of case', r.title],
    ['Where that remedy is heard', r.forum],
    ['What that forum can order', r.teeth],
    ['When that remedy arises', r.clock],
    ['Provision it comes from', r.provision],
    ['That remedy applies', gate || 'once the office has missed its deadline'],
    ['Geographic scope of that remedy', scope],
    ['This case is in', c.state],
    ['Is that remedy settled law in this state?', !scope ? 'not limited by state'
       : settledHere ? 'yes'
       : 'NO — the reasoning is available here but the amounts are not fixed in this state'],
    ['Implemented in this prototype', r.built === false ? 'no, it is documented only' : 'yes'],
    ['Caveat on that remedy', r.caveat || null]
  ];
}`;

if (s.includes(newFn)) console.log('  = remedyLines already applied');
else if (!s.includes(oldFn)) console.log('  ! remedyLines not found in the expected shape');
else { s = s.replace(oldFn, () => newFn); n++; }

/* the prompt has to be told the qualification is not optional */
const oldRule = `- Never state a date, an amount, a day count or an office that is not in the record.
- Do not promise an outcome, a timeline or that anything will be fixed.`;
const newRule = `- Never state a date, an amount, a day count or an office that is not in the record.
- A remedy is never mentioned on its own. If the record says it applies only under a
  condition, or that it is not settled law in this state, say that in the same sentence as
  the remedy. Never quote an amount that the record says is not fixed in this state.
- Do not promise an outcome, a timeline or that anything will be fixed.`;

if (s.includes(newRule)) console.log('  = prompt rule already applied');
else if (!s.includes(oldRule)) console.log('  ! prompt rules not found');
else { s = s.replace(oldRule, () => newRule); n++; }

fs.writeFileSync(F, s);
console.log('ai.js  ' + n + ' edits');
