/* Make joining from the wall settle deterministically.

   addName() wrote its confirmation into the card and then kicked off load(), which rebuilt
   every card from scratch — so the confirmation was wiped by the refresh that was supposed
   to show the new count, and the count that landed could be the pre-signature one because
   nothing waited for the refresh.

   The signed cases are now remembered in a set that card() reads, so the confirmation is a
   property of the render rather than something painted over it, and load() is awaited so the
   count on screen is the count the server has. */

import fs from 'node:fs';

const F = 'public/near-you.html';
let s = fs.readFileSync(F, 'utf8');
let n = 0;
const swap = (a, b, marker) => {
  if (marker && s.includes(marker)) { console.log('  = already applied'); return; }
  if (!s.includes(a)) { console.log('  ! miss: ' + a.slice(0, 55)); return; }
  s = s.replace(a, b); n++;
};

swap(`let all = [];`,
`let all = [];
/* Cases this device has signed. Held here so a refresh cannot paint over the confirmation. */
const mine = new Set();`,
'const mine = new Set();');

swap(`  const act = el.querySelector('.act');
  if (closed) {`,
`  const act = el.querySelector('.act');
  if (mine.has(c.code)) {
    act.innerHTML = '<small style="color:var(--teal);font-weight:800">Your name is on this case.<br />'
      + 'It is never shown to other signatories.</small>';
  } else if (closed) {`,
'if (mine.has(c.code))');

swap(`  const res = await EA.join(c.code, { source: 'near-you' });
  button.disabled = false;
  button.textContent = 'Add my name';

  if (res && res.ok) {
    act.innerHTML = '<small style="color:var(--teal);font-weight:800">Your name is on this case.<br />It is not shown to other signatories.</small>';
    load();
    return;
  }
  if (res && res.reason === 'already') {
    act.innerHTML = '<small style="color:var(--teal);font-weight:800">You are already on this case.</small>';
  }`,
`  const res = await EA.join(c.code, { source: 'near-you' });

  /* Both of these mean the signature is on the case; "already" just means it was on it
     before today. Either way the card should stop offering to add it again. */
  if (res && (res.ok || res.reason === 'already')) {
    mine.add(c.code);
    await load();          /* awaited, so the count on screen is the count the server has */
    return;
  }

  button.disabled = false;
  button.textContent = 'Add my name';`,
'awaited, so the count on screen');

fs.writeFileSync(F, s);
console.log('near-you.html  ' + n + ' edits');
