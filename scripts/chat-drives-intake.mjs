/* The conversation drives the intake now, not a list of steps.
 *
 * Before: buildSteps() took two hand-written questions off `domain.asks`, advance() walked them in
 * order, and the model's only contribution was choosing which array. That is a wizard with a
 * classifier bolted to the front, and it is what made the page feel like a form.
 *
 * After: every citizen message goes to /api/chat with the transcript so far, and the model decides
 * what to ask from what has actually been said. The transcript lives here, on the device, which is
 * why a reload now resumes a conversation instead of restarting it.
 *
 * Two steps stay, deliberately, and they are not questions the model should be inventing:
 *   · LOCATION — the one field /route genuinely needs for jurisdiction and the one the model cannot
 *     reliably extract. If the summary already found a place, it is prefilled and confirmed in one
 *     turn instead of asked cold.
 *   · EVIDENCE — an affordance, not a question. A file picker, offered once.
 *
 * The downstream contract is untouched. fetchRoute(), renderRoute(), saidRows() and fileCase() keep
 * reading the flat `answers` object and `summaryFields`; only the way those get filled has changed.
 */

import fs from 'node:fs';

const F = 'public/report.html';
let s = fs.readFileSync(F, 'utf8');
const before = s.length;

if (s.includes('let convo =')) { console.log('= already applied'); process.exit(0); }

const swap = (from, to, label) => {
  if (!s.includes(from)) { console.log('  ! anchor miss: ' + label); process.exit(1); }
  s = s.split(from).join(to);
  console.log('  ~ ' + label);
};

/* ── 1. state: the transcript, and the two remaining steps ──────────────────── */
swap(
  "let steps = [], step = 0, awaiting = false, phase = 'intake', isPublic = false, filedRecord = null, dismissedMatch = false;",
  "let steps = [], step = 0, awaiting = false, phase = 'intake', isPublic = false, filedRecord = null, dismissedMatch = false;\n"
  + "/* The conversation itself. Posted with every turn and kept in the draft, so a reload resumes\n"
  + "   rather than restarting. The server holds nothing. */\n"
  + "let convo = [];\n"
  + "/* Where we are once the talking is done: 'talk' -> 'evidence' -> 'place' -> route. */\n"
  + "let afterTalk = null;",
  'transcript state added'
);

/* ── 2. buildSteps and advance are replaced by the conversation ─────────────── */
{
  const start = s.indexOf('function buildSteps() {');
  const end = s.indexOf('const progressLabels =');
  if (start < 0 || end < 0 || end < start) { console.log('  ! could not bound buildSteps'); process.exit(1); }

  const replacement = `/* The opening line. The only scripted thing left, because somebody has to speak first — and if
   they arrived by clicking a topic card we open on that topic rather than asking them to name it. */
function opener() {
  const op = topic && TOPIC_OPENER[topic];
  if (op) return { q: op.q, hint: op.hint, chips: op.chips };
  return {
    q: 'क्या हुआ? What happened?',
    hint: 'Say it the way you would tell a neighbour. I find the office from your words — you never pick a department.',
    chips: ['Road not repaired', 'Ration denied', 'Bank debited wrongly', 'PF claim stuck']
  };
}

/* Evidence is an affordance, not a question the model should invent. */
function evidenceStep() {
  return {
    key: 'evidence', label: 'Evidence', kind: 'evidence',
    q: 'Anything to attach?',
    hint: (domain.evidence || 'A photo or a letter, if you have one.') + ' Use the clip, or drag files onto this screen.',
    chips: ['Nothing to attach']
  };
}

`;
  s = s.slice(0, start) + replacement + s.slice(end);
  console.log('  ~ buildSteps replaced by opener() and evidenceStep()');
}

/* ── 3. save() carries the transcript ──────────────────────────────────────── */
swap(
  "function save() { if (window.EA) EA.patch({ draft: { issue: issue, step: step, answers: answers, domain: domain.key, at: Date.now() } }); }",
  "function save() {\n"
  + "  if (!window.EA) return;\n"
  + "  /* convo goes into the draft, which is the whole reason a reload can resume a conversation. */\n"
  + "  EA.patch({ draft: { issue: issue, step: step, answers: answers, domain: domain.key, convo: convo, afterTalk: afterTalk, at: Date.now() } });\n"
  + "}",
  'draft carries the transcript'
);

/* ── 4. advance() becomes the post-conversation tail ────────────────────────── */
{
  const start = s.indexOf('function advance() {');
  const end = s.indexOf('function send(text) {');
  if (start < 0 || end < 0) { console.log('  ! could not bound advance'); process.exit(1); }

  const replacement = `/* Once the talking is finished, two things remain: an offer to attach something, and the place.
   Neither is a question the model should be inventing, and the place is the one field /route
   genuinely needs. */
function advance() {
  if (afterTalk === 'evidence') {
    progressText.textContent = 'Checking what the office will need';
    const e = evidenceStep();
    steps = [e]; step = 0;
    askLocalised(e);
    return;
  }
  if (afterTalk === 'place') {
    progressText.textContent = 'Locating the jurisdiction';
    const p = locationStep();
    /* If the summary already found a place, confirm it in one turn instead of asking cold. */
    if (answers.area && !answers.location) {
      p.q = 'Is this in ' + answers.area + '?';
      p.hint = 'If that is right, say yes. If not, tell me the village or ward, then block and district.';
      p.chips = ['Yes, that is right'];
    }
    steps = [p]; step = 0;
    askLocalised(p);
    return;
  }
  route();
}

/* One turn of the actual conversation. */
async function talk(value) {
  awaiting = true;
  const ghost = typing();
  try {
    const first = convo.length === 0;
    if (first) answers.grievance = value;

    /* On the first message the classifier runs alongside the conversation: /chat gives us the next
       question, /intake gives us apiDomain, warning, isPublic and the rest of what the route screen
       and the filing call read. Two calls, once, in parallel. */
    const [res] = await Promise.all([
      window.EAAPI.chat(convo, value),
      first ? classifyRemote(value).then(() => {
        isPublic = !!domain.isPublic;
        if (!coordsAsked) askForCoords();
      }) : Promise.resolve()
    ]);

    ghost.remove();

    if (!res || res.error) {
      /* Never a dead end: the citizen is one tap from the review screen. */
      bubble('them', '<p>I could not reach the service just then.</p>'
        + '<p class="aside">Nothing is lost — you can carry on, or go straight to what I have so far.</p>');
      chipRow(['Show me what you have'], () => { afterTalk = 'place'; advance(); });
      return;
    }

    convo = Array.isArray(res.messages) ? res.messages : convo;
    if (res.domain && domain && !domain.apiDomain) domain.key = res.domain;
    if (res.language) domain.language = res.language;

    /* Count the citizen's own answers into ask0, ask1... — real replies under the keys /route and
       the review screen already understand. */
    if (!first) {
      const n = Object.keys(answers).filter((k) => /^ask/.test(k)).length;
      answers['ask' + n] = value;
    }
    if (res.flags && res.flags.redacted && res.flags.redacted.length) {
      bubble('them', '<p class="aside">I removed something that looked like an ID number. I never keep those.</p>');
    }

    save();

    if (res.emergency) {
      bubble('them', '<p>' + esc(res.say) + '</p>'
        + (res.emergency.numbers || []).map((n) => '<p class="aside"><b>' + esc(n.label || n.number || n) + '</b>'
            + (n.number ? ' — ' + esc(n.number) : '') + '</p>').join(''));
      return;
    }

    if (res.done) {
      if (res.say) bubble('them', '<p>' + esc(res.say) + '</p>');
      await finishTalking();
      return;
    }

    ask(res.say, null, null);
  } catch (err) {
    ghost.remove();
    bubble('them', '<p>Something went wrong at our end.</p>'
      + '<p class="aside">You can still go on to what I have so far.</p>');
    chipRow(['Show me what you have'], () => { afterTalk = 'place'; advance(); });
  } finally {
    awaiting = false;
  }
}

/* The conversation is over: write the case file from it, then collect the two things it cannot. */
async function finishTalking() {
  const ghost = typing();
  try {
    const f = window.EAAPI.chatSummary ? await window.EAAPI.chatSummary(convo) : null;
    if (f && !f.error) {
      if (Array.isArray(f.fields) && f.fields.length) summaryFields = f.fields;
      if (f.title) domain.title = f.title;
      if (f.summary) domain.summary = f.summary;
      if (f.area) answers.area = f.area;
      if (f.state) domain.state = f.state;
      if (f.language) domain.language = f.language;
    }
  } catch (e) { /* the fallback is their own words, which we already have */ }
  ghost.remove();
  afterTalk = domain.evidence ? 'evidence' : 'place';
  save();
  advance();
}

/* A row of tappable chips under the last thing she said. */
function chipRow(labels, onPick) {
  const row = document.createElement('div');
  row.className = 'chips';
  row.innerHTML = labels.map((l) => '<button class="chip" type="button">' + esc(l) + '</button>').join('');
  thread.appendChild(row);
  row.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    row.remove();
    onPick(b.textContent);
  }));
  scrollDown();
}

`;
  s = s.slice(0, start) + replacement + s.slice(end);
  console.log('  ~ advance() rewritten, talk() and finishTalking() added');
}

/* ── 5. send() routes into the conversation ────────────────────────────────── */
{
  const start = s.indexOf('function send(text) {');
  const end = s.indexOf("/* ---------- the route screen ---------- */");
  if (start < 0 || end < 0) { console.log('  ! could not bound send'); process.exit(1); }

  const replacement = `function send(text) {
  const value = (text || reply.value).trim();
  if (awaiting) return;
  if (!value && !files.length) return;
  const entry = steps[step] || {};

  let inner = '';
  if (value) inner += '<p>' + esc(value) + '</p>';
  if (files.length && entry.kind === 'evidence') inner += '<div class="att">' + files.map((f) => '<b>' + esc(f.name) + ' <s>' + sizeOf(f.size) + '</s></b>').join('') + '</div>';
  bubble('you', inner);
  reply.value = '';
  reply.style.height = '';

  if (phase === 'route') { editFromMessage(value); return; }

  /* The two collected steps, after the talking. */
  if (afterTalk === 'evidence' && entry.kind === 'evidence') {
    tray.classList.remove('show');
    tray.innerHTML = '';
    answers.evidence = files.length ? files.length + (files.length === 1 ? ' file' : ' files') : 'None attached';
    afterTalk = 'place';
    save();
    advance();
    return;
  }
  if (afterTalk === 'place' && entry.kind === 'location') {
    /* "Yes, that is right" confirms the place the summary already found. */
    answers.location = /^(yes|haan|ha|correct|right|sahi)/i.test(value) && answers.area ? answers.area : value;
    if (coords) answers.coords = coords.lat + ',' + coords.lon;
    afterTalk = null;
    save();
    advance();
    return;
  }

  /* Otherwise this is the conversation. */
  talk(value);
}

`;
  s = s.slice(0, start) + replacement + s.slice(end);
  console.log('  ~ send() routes into talk()');
}

/* ── 6. loadSummary no longer reads a step list ────────────────────────────── */
{
  const start = s.indexOf('async function loadSummary() {');
  if (start < 0) { console.log('  ! loadSummary not found'); process.exit(1); }
  let end = start;
  const lines = s.slice(start).split('\n');
  let depth = 0, seen = false, idx = 0;
  for (; idx < lines.length; idx++) {
    for (const ch of lines[idx]) { if (ch === '{') { depth++; seen = true; } else if (ch === '}') depth--; }
    if (seen && depth === 0) break;
  }
  end = start + lines.slice(0, idx + 1).join('\n').length;

  const replacement = `/* The case file already came back from /chat/summary when the talking ended. This is the retry for
   the one path that can miss it — a resumed draft whose summary never ran. */
async function loadSummary() {
  if (summaryFields || !window.EAAPI || !window.EAAPI.chatSummary) return;
  if (!convo.length) return;
  try {
    const f = await window.EAAPI.chatSummary(convo);
    if (f && !f.error && Array.isArray(f.fields) && f.fields.length) summaryFields = f.fields;
  } catch (e) { /* saidRows falls back to their own words */ }
}`;
  s = s.slice(0, start) + replacement + s.slice(end);
  console.log('  ~ loadSummary reads the transcript, not a step list');
}

/* ── 7. the four banned hand-written strings ───────────────────────────────── */
swap(
  "{ label: 'Card and refusal', q: 'What is your ration card number, and what were you refused?', hint: 'The card number, the month, and what the dealer said. If you have no card, say that instead.' },",
  "{ label: 'What was refused', q: 'What were you refused, and in which month?', hint: 'What the dealer said, and how much you were owed. A photo of the register helps if you have one.' },",
  'the ration card-number question is gone'
);
swap(
  'Do not type your account number — I will never ask for it.',
  'I will never ask for your account number.',
  'bank hint no longer names the thing it forbids'
);
swap(
  'The branch name is enough. Never type your account number.',
  'The branch name is enough on its own.',
  'branch hint cleaned'
);

/* ── 8. the boot branches ──────────────────────────────────────────────────── */
{
  const start = s.indexOf("const draft = window.EA ? EA.read().draft : null;");
  if (start < 0) { console.log('  ! boot anchor not found'); process.exit(1); }
  const end = s.indexOf('</script>', start);
  if (end < 0) { console.log('  ! boot end not found'); process.exit(1); }

  const replacement = `const draft = window.EA ? EA.read().draft : null;

/* A conversation now survives a reload, which the old step machine could not do: the transcript is
   in the draft, so it is replayed turn for turn instead of being restarted. */
if (draft && Array.isArray(draft.convo) && draft.convo.length) {
  Object.assign(answers, draft.answers || {});
  convo = draft.convo;
  afterTalk = draft.afterTalk || null;
  if (draft.domain) domain = domains.find((d) => d.key === draft.domain) || domain;
  for (const m of convo) bubble(m.role === 'user' ? 'you' : 'them', '<p>' + esc(m.content) + '</p>');
  bubble('them', '<p class="aside">Picked up where we left off.</p>');
  if (afterTalk) advance();
  else reply.focus();
} else if (issue) {
  /* Arrived with a sentence typed on the home page. It goes through the conversation like any
     other first message — this path used to skip the model entirely. */
  const op = opener();
  ask(op.q, op.hint, null, () => {
    setTimeout(() => {
      bubble('you', '<p>' + esc(issue) + '</p>');
      talk(issue);
    }, 420);
  });
} else {
  if (topic) {
    const seeded = domains.find((d) => d.key === topic);
    if (seeded) { domain = seeded; isPublic = !!seeded.isPublic; }
    const nameOf = { road: 'Roads and potholes', power: 'Electricity', water: 'Water supply',
      bank: 'Banking and payments', pf: 'Provident fund', ration: 'Ration and PDS',
      rail: 'Railways', tax: 'Income tax refund', id: 'Government ID', bribe: 'A demand for money',
      other: 'Something else' }[topic];
    if (nameOf) bubble('them', '<p class="aside">' + esc(nameOf) + ' — I have that. If it is not the right one, just tell me and I will change it.</p>');
  }
  const op = opener();
  ask(op.q, op.hint, op.chips);
}
`;
  s = s.slice(0, start) + replacement + s.slice(end);
  console.log('  ~ boot branches rewritten (a reload now resumes the conversation)');
}

fs.writeFileSync(F, s);
console.log('\n  report.html ' + before + ' -> ' + s.length + ' bytes');
