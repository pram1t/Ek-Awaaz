/* Scenario 4 — the closure gate, made visible.

   The server has enforced this from the start: simulateOfficerReply() moves a case to
   awaiting_confirmation and never further, and only confirmCase() can set confirmed_fixed.
   But nothing in the product called either endpoint, so the single strongest claim this
   project makes — an officer's report does not close a case — was invisible to anyone who
   had not read server/db.js.

   This puts it on the case card, staged so the contradiction is the thing you see: the
   office writes "treated as disposed of", the card still reads open, and the only control
   that can close it belongs to the citizen.

   Two honesty rules held in the markup itself:
   - the button that fabricates an officer reply is labelled a demo control and styled
     unlike every real action on the page, because it is the one thing here that is fake;
   - the officialese is shown verbatim above the plain-language version, so the rewrite can
     be checked against the original rather than taken on trust. */

import fs from 'node:fs';

const F = 'public/my-cases.html';
let h = fs.readFileSync(F, 'utf8');
const was = h.length;
let n = 0;
/* Re-runnable: `marker` is a string unique to the patched result, so an edit already
   applied is skipped rather than duplicated. Anchors are kept to single lines — the working
   copy is CRLF and a multi-line anchor written with \n never matches. */
const swap = (a, b, marker) => {
  if (marker && h.includes(marker)) { console.log('  = already applied: ' + marker); return; }
  if (!h.includes(a)) { console.log('  ! miss: ' + a.slice(0, 64)); return; }
  h = h.replace(a, b); n++;
};

/* ---------------- styles ---------------- */

swap(
  `<style>.entry-card.public .eyebrow{color:#b9d3ff!important}</style>`,
  `<style>.entry-card.public .eyebrow{color:#b9d3ff!important}</style>
<style>
  /* The live rows emit .status.resolved, for which no rule existed, so a confirmed case got
     an unstyled chip. Alias it to the green the static demo already uses. */
  .case-row .status.resolved{background:#e3f2ee;color:var(--teal)}

  .gate{grid-column:1/-1;margin-top:18px;padding-top:16px;border-top:1px dashed #cbd5df}
  .gate-demo{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .gate-demo p{margin:0;font-size:11.5px;color:#8a99a8;line-height:1.45;flex:1 1 240px}
  .gate-demo button{border:1px dashed #9db4ca;background:#f6f8fa;color:#5d6b79;border-radius:4px;
    padding:8px 12px;font:800 11px Manrope,sans-serif;cursor:pointer}
  .gate-demo button:hover{border-color:var(--navy);color:var(--navy)}
  .gate-demo button[disabled]{opacity:.55;cursor:default}

  .gate-label{font:800 9.5px Manrope,sans-serif;letter-spacing:.09em;text-transform:uppercase;
    color:#8a99a8;margin:0 0 6px}
  .gate-atr{margin:0 0 14px;padding:13px 15px;background:#f6f8fa;border-left:3px solid #b9c8d6;
    font:italic 12.5px/1.6 Manrope,sans-serif;color:#48596b}
  .gate-atr mark{background:#fde68a;color:#5a4410;font-style:normal;font-weight:800;padding:0 2px}
  .gate-plain{margin:0 0 16px;padding:13px 15px;background:#eef7f5;border-left:3px solid var(--teal);
    font-size:13px;line-height:1.6;color:#24665f}
  .gate-plain b{display:block;color:var(--teal);font-size:9.5px;letter-spacing:.09em;
    text-transform:uppercase;margin-bottom:5px}

  /* The whole argument in one line, so it cannot be missed. */
  .gate-claim{margin:0 0 14px;padding:12px 15px;background:#fff6e8;border-left:3px solid var(--amber);
    font-size:13px;line-height:1.55;color:#5a4410}
  .gate-claim b{color:#7a4a05}

  .gate-ask{margin:0 0 10px;font:800 13px Manrope,sans-serif;color:var(--navy)}
  .gate-verdicts{display:flex;gap:8px;flex-wrap:wrap}
  .gate-verdicts button{border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:4px;
    padding:10px 14px;font:800 11.5px Manrope,sans-serif;cursor:pointer;
    transition:border-color .15s,background .15s}
  .gate-verdicts button:hover{border-color:var(--blue);background:#f4f7fd}
  .gate-verdicts button.yes:hover{border-color:var(--teal);background:#eef7f5}
  .gate-verdicts button.no:hover{border-color:#9f1239;background:#fdf2f5}
  .gate-verdicts button[disabled]{opacity:.5;cursor:default}

  .gate-out{margin:12px 0 0;padding:12px 15px;border-radius:4px;font-size:13px;line-height:1.55}
  .gate-out b{display:block;font-size:13px}
  .gate-out small{display:block;margin-top:5px;opacity:.9;font-size:11.5px;line-height:1.5}
  .gate-out.ok{background:#e3f2ee;color:#1a5c54}
  .gate-out.reopened{background:#fdf2f5;color:#8a1638}
  .gate-out.part{background:#fff6e8;color:#5a4410}
  .gate-out.bad{background:#fdf2f5;color:#8a1638}
  .gate-busy{font-size:12px;color:var(--muted);margin:10px 0 0}
  @media(max-width:760px){.gate-verdicts button{flex:1 1 100%}}
</style>`, '.gate-claim');

/* ---------------- behaviour ---------------- */

swap(
  `        list.insertBefore(row, list.firstChild);`,
  `        buildGate(row, f);
        list.insertBefore(row, list.firstChild);`, 'buildGate(row, f);');

/* confirmedBy and the response date have to survive the mapping, or the closed state
   cannot say who closed it or when the office replied */
swap(
  `          overdue: c.overdue, escalatesTo: c.escalatesTo, supporters: c.supporters, target: c.target`,
  `          overdue: c.overdue, escalatesTo: c.escalatesTo, supporters: c.supporters, target: c.target,
          confirmedBy: c.confirmedBy, officerRespondedOn: c.officerRespondedOn`, 'confirmedBy: c.confirmedBy');

swap(
  `    if (!live) {`,
  `    /* ---------- the closure gate ----------

       One rule underneath all of it: confirmed_fixed is reachable only through /confirm,
       which requires the citizen's verified mobile. The officer endpoint can move a case as
       far as awaiting_confirmation and no further. The UI below does not enforce that — the
       server does — it only makes it legible. */

    const DISPOSED = /treated as disposed of|disposed of at this end/i;

    function buildGate(row, f) {
      const gate = document.createElement('div');
      gate.className = 'gate';
      /* case cards are clickable in the static demo; nothing inside the gate should inherit it */
      gate.addEventListener('click', (e) => e.stopPropagation());
      row.appendChild(gate);
      render(gate, f);
    }

    function render(gate, f) {
      if (f.status === 'confirmed_fixed') {
        gate.innerHTML = outcome('ok', 'Closed by you.',
          'Confirmed fixed' + (f.confirmedBy ? ' by ' + f.confirmedBy + (f.confirmedBy === 1 ? ' person' : ' people') : '') +
          '. No officer report closed this. Your confirmation did.');
        return;
      }
      if (f.status === 'reopened') {
        gate.innerHTML = outcome('reopened', 'Open again.',
          'You said it was not fixed, so the case reopened with its whole history intact and the clock running. It is the same case, not a new one.');
        return;
      }
      if (f.status === 'partly_fixed') {
        gate.innerHTML = outcome('part', 'Recorded as partly fixed.',
          'The case stays open. Partly is not closed.');
        return;
      }
      if (f.status === 'awaiting_confirmation') { showReply(gate, f, null); return; }

      /* still with the office */
      gate.innerHTML =
        '<div class="gate-demo"><button type="button">Simulate the office replying</button>' +
        '<p>Demo control — the one fabricated thing on this page. In the real system this arrives from the office. It is here so you can see what happens next, and what does not.</p></div>';

      gate.querySelector('button').addEventListener('click', async (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        b.textContent = 'Waiting for the office\\u2026';
        const res = await window.EAAPI.simulateReply(f.id, 'en');
        if (res.error) {
          gate.innerHTML = outcome('bad', 'Could not stage the reply.', EA.esc(res.error));
          return;
        }
        f.status = 'awaiting_confirmation';
        showReply(gate, f, res);
        markStage(gate, 2);
      });
    }

    function showReply(gate, f, res) {
      const atr = res && res.atr;
      const plain = res && res.plain;

      /* Mark the words that would have closed the case on the old portal, so the
         contradiction is shown rather than asserted. */
      const marked = atr ? EA.esc(atr).replace(DISPOSED, (m) => '<mark>' + m + '</mark>') : null;

      gate.innerHTML =
        (marked
          ? '<p class="gate-label">What the office wrote</p><p class="gate-atr">' + marked + '</p>' +
            (plain ? '<p class="gate-plain"><b>What that means</b>' + EA.esc(plain) + '</p>' : '')
          : '<p class="gate-label">The office has replied</p><p class="gate-atr">Their report is on file' +
            (f.officerRespondedOn ? ', dated ' + EA.esc(f.officerRespondedOn) : '') + '.</p>') +
        '<p class="gate-claim">Their report says <b>disposed of</b>. This case still says <b>open</b>. ' +
          'On the current portal that report would have closed it. Here only you can.</p>' +
        '<p class="gate-ask">Is it actually fixed?</p>' +
        '<div class="gate-verdicts">' +
          '<button type="button" class="yes" data-v="fixed">Yes, it is fixed</button>' +
          '<button type="button" class="no" data-v="not_fixed">No, it is not fixed</button>' +
          '<button type="button" data-v="partly">Partly</button>' +
        '</div>';

      gate.querySelectorAll('[data-v]').forEach((b) =>
        b.addEventListener('click', () => send(gate, f, b.dataset.v)));
    }

    async function send(gate, f, verdict) {
      const buttons = [...gate.querySelectorAll('[data-v]')];
      buttons.forEach((b) => { b.disabled = true; });
      const busy = document.createElement('p');
      busy.className = 'gate-busy';
      busy.textContent = 'Recording your answer\\u2026';
      gate.appendChild(busy);

      const res = await window.EAAPI.confirm(f.id, state.phone, verdict);
      busy.remove();

      if (res.error) {
        buttons.forEach((b) => { b.disabled = false; });
        gate.insertAdjacentHTML('beforeend', outcome('bad', 'Not recorded.', EA.esc(res.error)));
        return;
      }

      f.status = res.case.status;
      f.confirmedBy = res.case.confirmedBy;
      render(gate, f);

      /* A case many people signed cannot be closed by one of them alone. Say so, rather
         than looking stuck after a "yes". */
      if (verdict === 'fixed' && res.case.status !== 'confirmed_fixed') {
        gate.innerHTML = outcome('part', 'Your confirmation is recorded.',
          EA.esc(res.message) + ' A case other people signed cannot be closed by one of them alone.');
      }

      const chip = gate.parentElement.querySelector('.status');
      if (chip) {
        chip.textContent = STATUS[f.status] || 'Filed';
        chip.className = 'status ' + (f.status === 'confirmed_fixed' ? 'resolved' : 'pending');
      }
      if (f.status === 'confirmed_fixed') markStage(gate, 3);
    }

    function markStage(gate, index) {
      const stages = gate.parentElement.querySelectorAll('.stages > div');
      if (!stages[index]) return;
      stages[index].classList.add('on');
      const bar = stages[index].querySelector('i');
      if (bar) bar.className = index === 3 ? 'done' : 'now';
    }

    function outcome(kind, head, body) {
      return '<p class="gate-out ' + kind + '"><b>' + head + '</b><small>' + body + '</small></p>';
    }

    if (!live) {`, 'function buildGate(row, f)');

fs.writeFileSync(F, h);
console.log('my-cases.html  ' + n + ' edits  ' + was + ' -> ' + h.length);
