/* Four faults from a live walkthrough of a pension grievance.
 *
 * 1. She asked "Aapka pension ka issue kis office se sambandhit hai?" — which office handles this,
 *    the one question this product exists to answer FOR the citizen. askIsBanned has patterns for
 *    English and for Devanagari, and none for romanised Hindi, which is the register she actually
 *    speaks in to a Hinglish user. The guardrail was blind in the language most likely to trip it.
 *
 * 2. The place question was asked anyway, and asked as "village or ward, then block and district" —
 *    to somebody whose pension has not arrived. A block and a district decide nothing about a
 *    pension. Worse, whatever they typed went straight into the case file: the answer recorded as
 *    "Where" was "What time am I?".
 *
 * 3. The case file was a transcript, not a summary. "What happened" held the first message verbatim
 *    because the code forced it there, overwriting the summary the model had just written.
 *
 * 4. The "Nothing to attach" chip stayed English inside a Hindi conversation.
 */

import fs from 'node:fs';

/* ── 1. the guardrail learns romanised Hindi ───────────────────────────────── */
{
  const F = 'server/banned-asks.js';
  let s = fs.readFileSync(F, 'utf8');
  const anchor = '  // "which office handles / looks after / is responsible for this"';
  if (!s.includes(anchor)) { console.log('  ! banned-asks anchor miss'); process.exit(1); }
  if (s.includes('kis office')) {
    console.log('  = banned-asks already covers romanised Hindi');
  } else {
    const add = `  /* Romanised Hindi. She speaks this register to anyone who writes Hinglish, so the filter was
     blind in exactly the language most likely to trip it. A live walkthrough produced
     "Aapka pension ka issue kis office se sambandhit hai?" and this file allowed it. */
  /\\b(kis|kaun\\s*sa|konsa|kaunse)\\s*(office|department|vibhag|daftar|dept|ministry|authority|adhikari)\\b/i,
  /\\b(office|department|vibhag|daftar)\\s*(se|me|mein)\\s*(sambandhit|sampark|complaint|shikayat)\\b/i,
  /\\b(kis|kaun\\s*sa|konsa)\\s*(vibhag|mantralaya|adhikari)\\b/i,
  /(किस|कौन\\s*से)\\s*(विभाग|दफ़्तर|दफ्तर|कार्यालय|मंत्रालय)/,

` + anchor;
    s = s.replace(anchor, () => add);
    fs.writeFileSync(F, s);
    console.log('  ~ banned-asks: romanised Hindi office questions');
  }
}

/* ── 2 & 3. the summary is a summary, and it carries the place ─────────────── */
{
  const F = 'server/chat.js';
  let s = fs.readFileSync(F, 'utf8');

  /* The forced overwrite is what made the form literal. */
  const from = `    /* The one thing they definitely said is the thing they came to say. */
    if (!fields.length || !/what|happen|problem|issue|complaint/i.test(fields[0].label)) {
      fields.unshift({ label: 'What happened', value: grievance, kind: 'text' });
    }`;
  const to = `    /* Do not overwrite the model's own summary with the raw first message. Forcing the verbatim
       sentence in here is what made the review screen read as a transcript rather than a case file:
       "What happened — I have not received my pension from last 4 months" is the citizen's words
       played back, not a summary of them. Only insert when the model gave us nothing usable. */
    if (!fields.length) {
      fields.push({ label: 'What happened', value: clean(out.summary, 300) || grievance, kind: 'text' });
    }`;
  if (!s.includes(from)) { console.log('  ! summary anchor miss'); process.exit(1); }
  s = s.split(from).join(to);

  /* Ask for condensed values explicitly. */
  const pFrom = `- Keep their own words where you can. Do not make them sound more official than they are.\`;`;
  const pTo = `- Keep their own words where you can. Do not make them sound more official than they are.
- SUMMARISE. A field value is the fact, not the sentence it arrived in. "Pension not received for
  four months", not "I have not received my pension from last 4 months". Six words beats sixteen.
- If the citizen never gave a place, return "area" empty. Do NOT invent one, and never put an
  unrelated answer into it.\`;`;
  if (s.includes(pFrom)) { s = s.split(pFrom).join(pTo); }
  else console.log('  ! summary prompt anchor miss');

  fs.writeFileSync(F, s);
  console.log('  ~ chat.js: the case file summarises instead of transcribing');
}

/* ── 2b. the place question, and refusing junk into the case ───────────────── */
{
  const F = 'public/report.html';
  let s = fs.readFileSync(F, 'utf8');

  /* A generic place question that fits any grievance, used when the domain has no shaped one.
     "Village or ward, then block and district" is wrong for a pension, a bank or a train. */
  const from = `  other:  { q: 'Where is this? Village or ward, then block and district.',
            hint: 'A landmark helps. This is what decides which office holds the case.' },`;
  const to = `  pension:{ q: 'Which office or bank pays your pension, and in which city?',
            hint: 'The branch or the office you deal with. Never type an account number.' },
  other:  { q: 'Where is this happening?',
            hint: 'A village or ward, or an office or branch — whichever fits. This is what decides who holds the case.' },`;
  if (s.includes(from)) { s = s.split(from).join(to); console.log('  ~ report.html: a place question that fits any grievance'); }
  else console.log('  ! PLACE_ASK anchor miss');

  /* Junk must not become the case file's "Where". */
  const jFrom = `  if (afterTalk === 'place' && entry.kind === 'location') {`;
  const jTo = `  if (afterTalk === 'place' && entry.kind === 'location') {
    /* "What time am I?" was accepted as a location and written into the case. A place is not a
       question, and it is not one stray word. One re-ask, then it is taken as given — a person who
       cannot name their ward must still be able to file. */
    const looksLikePlace = value.length >= 3 && !/\\?$/.test(value) && !/^(what|who|when|why|how|kya|kaun|kab)\\b/i.test(value);
    if (!looksLikePlace && !placeReasked) {
      placeReasked = true;
      ask('Sorry — I need the place. A village, ward, town, office or branch is enough.', null, null);
      return;
    }`;
  if (s.includes(jFrom)) { s = s.split(jFrom).join(jTo); console.log('  ~ report.html: a non-place answer is re-asked once'); }
  else console.log('  ! place branch anchor miss');

  const dFrom = 'let afterTalk = null;';
  const dTo = 'let afterTalk = null;\nlet placeReasked = false;';
  if (s.includes(dFrom)) s = s.split(dFrom).join(dTo);

  /* ── 4. the chips speak the citizen's language ───────────────────────────── */
  const cFrom = `  const wanted = [entry.q, entry.hint || ''].filter(Boolean);
  const out = await EAAPI.say(wanted, lang);
  const got = out && !out.error && Array.isArray(out.lines) && out.lines.length === wanted.length
    ? out.lines : wanted;
  ask(got[0], entry.hint ? got[1] : null, entry.chips);`;
  const cTo = `  /* The chips are ours too. A Hindi conversation with an English "Nothing to attach" button under
     it is the same inconsistency as an English question — it just looks smaller. */
  const chips = Array.isArray(entry.chips) ? entry.chips : [];
  const wanted = [entry.q, entry.hint || ''].filter(Boolean).concat(chips);
  const out = await EAAPI.say(wanted, lang);
  const got = out && !out.error && Array.isArray(out.lines) && out.lines.length === wanted.length
    ? out.lines : wanted;
  const nQ = entry.hint ? 2 : 1;
  ask(got[0], entry.hint ? got[1] : null, chips.length ? got.slice(nQ) : entry.chips);`;
  if (s.includes(cFrom)) { s = s.split(cFrom).join(cTo); console.log('  ~ report.html: chips are translated with the question'); }
  else console.log('  ! askLocalised anchor miss');

  fs.writeFileSync(F, s);
}

console.log('done');
