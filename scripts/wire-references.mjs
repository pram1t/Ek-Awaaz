/* Give the conversation the references an officer actually needs.
 *
 * routing.json now names them for all sixteen domains — a PPO number for a pension, a UAN for
 * provident fund, a PNR for a train, a consumer number off an electricity bill. These are not the
 * identifiers we refuse. They identify a CLAIM rather than a person, they are what somebody types
 * to find the file, and a citizen who quotes one is helped faster. The government's own assistant
 * asks for them, and on that point it is right.
 *
 * Until now the conversation had no idea they existed, so it asked whatever it could think of.
 */

import fs from 'node:fs';

const F = 'server/chat.js';
let lines = fs.readFileSync(F, 'utf8').split('\n');

if (lines.some((l) => l.includes('FOR THIS KIND OF PROBLEM'))) {
  console.log('= already wired'); process.exit(0);
}

const at = (needle, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && l.includes(needle));
  if (i < 0) throw new Error('not found: ' + needle);
  return i;
};

/* ── 1. systemPrompt takes the domain guessed so far ───────────────────────── */
{
  const i = at('function systemPrompt() {');
  lines[i] = 'function systemPrompt(guessed) {';
  /* insert the reference block after the domains line */
  const j = at('const domains = Object.entries(routing.domains)', i);
  lines.splice(j + 1, 0,
    '',
    '  /* The references an officer needs for THIS kind of problem. Safe to ask for: a scheme',
    '     reference identifies a claim, not a person, and is what somebody types to find the file.',
    '     Listed to the model, never read out to the citizen as a list. */',
    '  const d = guessed && routing.domains[guessed];',
    '  const list = d && Array.isArray(d.identifiers) ? d.identifiers : [];',
    '  const refs = list.length',
    "    ? '\\n\\nFOR THIS KIND OF PROBLEM the office will need these. Ask for the needed ones, one at a'",
    "      + ' time, in your own words — never as a list, never all in one message:\\n'",
    "      + list.map((i) => '- ' + i.label + (i.required ? ' (needed)' : ' (optional)')",
    "          + (i.hint ? ' — ' + i.hint : '')).join('\\n')",
    "      + '\\nThese are safe to ask for: they are scheme references, not bank or identity numbers.'",
    "    : '';");
  console.log('  ~ systemPrompt(guessed) builds the reference block');
}

/* ── 2. splice it into the prompt text ─────────────────────────────────────── */
{
  const i = at('REPLY AS JSON, and nothing outside it:');
  lines[i] = '${refs}\n\nREPLY AS JSON, and nothing outside it:';
  console.log('  ~ the references are in the prompt');
}

/* ── 3. thread the domain through ──────────────────────────────────────────── */
{
  const i = at('async function callModel(messages, correction) {');
  lines[i] = 'async function callModel(messages, correction, guessed) {';
  const j = at('content: systemPrompt() + correction }', i);
  lines[j] = lines[j].replace('systemPrompt() + correction', 'systemPrompt(guessed) + correction');
  console.log('  ~ callModel carries it');
}
{
  const i = at('out = await callModel(messages, correction);');
  lines[i] = lines[i].replace('callModel(messages, correction)', 'callModel(messages, correction, guessed)');
}

/* ── 4. the guess: what the client already knows, else what the last turn said ─ */
{
  const i = at("  let correction = '';");
  lines.splice(i, 0,
    '  /* What the client already knows about the domain, so turn two asks for that domain\'s',
    '     reference rather than guessing the problem again from nothing. */',
    '  let guessed = hint && routing.domains[hint] ? hint : null;');
  console.log('  ~ the guessed domain is tracked across turns');
}

/* ── 5. the caller accepts a domain hint from the client ───────────────────── */
{
  const i = at('export async function chat(history, text) {');
  lines[i] = 'export async function chat(history, text, hint) {';
  /* keep the guess fresh: whatever the model returns becomes the hint the client sends next time */
  console.log('  ~ chat(history, text, hint)');
}

fs.writeFileSync(F, lines.join('\n'));
console.log('done');
