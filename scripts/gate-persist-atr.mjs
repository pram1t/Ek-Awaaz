/* Keep the officer's words on the card after a refresh.

   showReply() only had the officialese when it came back from the simulate-reply call, so a
   case already sitting in awaiting_confirmation when the page loaded fell to "Their report is
   on file" — and the contrast between what the office wrote and what it means, which is the
   entire point of the screen, disappeared on reload. The case row already carries officerAtr;
   it just was not being passed through.

   The plain-language rewrite is not stored on the case, so it is fetched after first paint:
   the verdict buttons are usable immediately and the rewrite slots in when it arrives. The
   call is cached server-side on the reply text, so a page of these costs one call. */

import fs from 'node:fs';

const F = 'public/my-cases.html';
let h = fs.readFileSync(F, 'utf8');
let n = 0;
const swap = (a, b, marker) => {
  if (marker && h.includes(marker)) { console.log('  = already applied: ' + marker); return; }
  if (!h.includes(a)) { console.log('  ! miss: ' + a.slice(0, 60)); return; }
  h = h.replace(a, b); n++;
};

/* carry the officer's text into the row */
swap(
  `          confirmedBy: c.confirmedBy, officerRespondedOn: c.officerRespondedOn`,
  `          confirmedBy: c.confirmedBy, officerRespondedOn: c.officerRespondedOn, officerAtr: c.officerAtr`,
  'officerAtr: c.officerAtr');

/* use it, and fill the rewrite in afterwards */
swap(
  `      const atr = res && res.atr;
      const plain = res && res.plain;`,
  `      const atr = (res && res.atr) || f.officerAtr || null;
      const plain = res && res.plain;`,
  `(res && res.atr) || f.officerAtr`);

swap(
  `      gate.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => send(gate, f, b.dataset.v)));`,
  `      gate.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => send(gate, f, b.dataset.v)));

      /* Reload case: we have the officer's words but not the rewrite. Ask for it without
         blocking the verdict buttons, and say nothing if it does not arrive. */
      if (atr && !plain) fillPlain(gate, f);`,
  'if (atr && !plain) fillPlain(gate, f);');

swap(
  `    async function send(gate, f, verdict) {`,
  `    async function fillPlain(gate, f) {
      const slot = document.createElement('div');
      slot.className = 'gate-plain';
      slot.innerHTML = '<b>What that means</b><span>Putting it in plain language\\u2026</span>';
      const atrEl = gate.querySelector('.gate-atr');
      if (!atrEl) return;
      atrEl.after(slot);

      const res = await window.EAAPI.simulateReply(f.id, 'en');
      const lines = plainLines(res && res.plain);
      if (!lines) { slot.remove(); return; }
      slot.innerHTML = '<b>What that means</b>' + lines;
    }

    async function send(gate, f, verdict) {`,
  'async function fillPlain(gate, f)');

fs.writeFileSync(F, h);
console.log('my-cases.html  ' + n + ' edits');
