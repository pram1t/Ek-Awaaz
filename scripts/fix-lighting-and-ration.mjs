/* Two corrections from the last run.

   1. STREET LIGHTS ON A HIGHWAY went to infra.power. Defensible in the abstract — lighting is
      electricity — but it contradicts our own seed data, where EA-2026-05230 ("Street lights
      out, NH-44 km 118 to 121") routes to the NHAI Project Director. The road authority owns
      the lighting on its own road, and getting this wrong sends the case to a DISCOM that
      cannot touch it. Told to the model directly, and reinforced in the keyword fallback.

   2. RATION CARD NUMBER. The model asked for it; our hand-written question tells the citizen
      NOT to type it. One of the two had to give. A ration card number is a scheme reference in
      the same class as a UAN or a PNR — it is what the District Grievance Redressal Officer
      needs to find the household — so the ask stays and the contradictory hint goes. Aadhaar,
      PAN, bank account and card numbers remain refused. */

import fs from 'node:fs';

/* ---- 1a. tell the model ---- */

const af = 'server/ai.js';
let a = fs.readFileSync(af, 'utf8');
const aeol = a.includes('\r\n') ? '\r\n' : '\n';

const anchor = 'Read what the person said and return JSON.';
const note = [
  'One that is easy to get wrong: street lights, footpaths, culverts and dividers ON a road or',
  'highway belong to that road\'s authority, so they are infra.road, not infra.power. A DISCOM',
  'cannot touch a light the highway authority owns.',
  '',
  anchor
].join(aeol);

if (!a.includes(anchor)) { console.error('prompt anchor missing'); process.exit(1); }
if (!a.includes('street lights, footpaths')) {
  a = a.replace(anchor, note);
  fs.writeFileSync(af, a);
  console.log('ai.js  — lighting rule added to the prompt');
} else {
  console.log('ai.js  — lighting rule already present');
}

/* ---- 1b. and make the keyword fallback agree ---- */

a = fs.readFileSync(af, 'utf8');
const oldPower = "['infra.power', /electric|power|bijli|बिजली|outage|transformer|current|meter|light bill/i],";
const oldRoad  = "['infra.road', /pothole|road|sadak|सड़क|गड्ढ|gaddh|highway|street|rasta|रास्ता|culvert|footpath/i],";

if (a.includes(oldPower) && a.includes(oldRoad)) {
  /* road is checked BEFORE power, so a street light on a highway lands on the road rule */
  const newRoad = "['infra.road', /pothole|road|sadak|सड़क|गड्ढ|gaddh|highway|rajmarg|राजमार्ग|हाईवे|street ?light|streetlight|स्ट्रीट ?लाइट|रोशनी|divider|culvert|footpath|street|rasta|रास्ता/i],";
  a = a.replace(oldRoad, '');
  a = a.replace(oldPower, newRoad + '\n  ' + oldPower);
  fs.writeFileSync(af, a);
  console.log('ai.js  — road keyword now covers street lighting and is checked before power');
} else {
  console.log('ai.js  — keyword order already adjusted');
}

/* ---- 2. drop the contradictory hint ---- */

const rf = 'data/routing.json';
const r = JSON.parse(fs.readFileSync(rf, 'utf8'));
const ration = r.domains['supply.ration'];
let changed = false;
for (const ask of ration.asks || []) {
  if (ask.hint && /do not type your card number/i.test(ask.hint)) {
    ask.hint = ask.hint.replace(/\s*Do not type your card number\./i, '');
    changed = true;
  }
}
if (changed) {
  fs.writeFileSync(rf, JSON.stringify(r, null, 2) + '\n');
  console.log('routing.json — ration hint no longer contradicts the ask');
} else {
  console.log('routing.json — ration hint already consistent');
}
