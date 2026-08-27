/* Scenario 3 in the interface: open a live case and see its record, answer the office, and
   ask a question about it.

   The overlay markup already existed for the five hand-written demo cases. This adds a live
   path into the same shell so a case the citizen actually filed opens the same way, with the
   timeline built from the server rather than from a literal in the page.

   Two deliberate choices:
   - the reply box is always available, not only when the case is waiting on the citizen. The
     complaint that started this project is that a citizen has nowhere to say "that is not
     what I reported", and gating that on a status would put the door back.
   - the answer to a question is labelled with where it came from. "From the case record"
     when the model answered inside the record, and a plain note when it could not, so a
     refusal reads as a refusal rather than as a system failure. */

import fs from 'node:fs';

const F = 'public/my-cases.html';
let h = fs.readFileSync(F, 'utf8');
let n = 0;
const swap = (a, b, marker) => {
  if (marker && h.includes(marker)) { console.log('  = already applied: ' + marker); return; }
  if (!h.includes(a)) { console.log('  ! miss: ' + a.slice(0, 55)); return; }
  h = h.replace(a, b); n++;
};

/* ---------------- styles ---------------- */

swap(`<style>.entry-card.public .eyebrow{color:#b9d3ff!important}</style>`,
`<style>.entry-card.public .eyebrow{color:#b9d3ff!important}</style>
<style>
  .rec-open{grid-column:1/-1;margin-top:14px}
  .rec-open button{border:0;background:none;padding:0;color:var(--blue);cursor:pointer;
    font:800 11.5px Manrope,sans-serif;letter-spacing:.02em}
  .rec-open button:hover{text-decoration:underline}

  .tl{border-left:2px solid #cbd5df;margin:6px 0 26px 7px;padding-left:23px}
  .tl-item{position:relative;margin:0 0 20px}
  .tl-item::before{content:"";position:absolute;left:-31px;top:3px;width:12px;height:12px;
    border-radius:50%;background:var(--blue);border:3px solid #fff;box-shadow:0 0 0 1px var(--blue)}
  .tl-item.current::before{background:#fff;box-shadow:0 0 0 2px var(--amber)}
  .tl-item strong{display:block;color:var(--navy);font-size:13.5px}
  .tl-item time{display:block;color:#8a99a8;font-size:11px;font-weight:700;letter-spacing:.04em;margin:2px 0 4px}
  .tl-item p{margin:0;color:#48596b;font-size:12.5px;line-height:1.55}

  .rec-block{margin-top:24px;padding-top:20px;border-top:1px solid var(--line)}
  .rec-block h3{font-size:17px;margin:4px 0 6px}
  .rec-block>p{color:var(--muted);font-size:13px;margin:0 0 12px;line-height:1.55}
  .rec-block textarea{width:100%;border:1px solid var(--line);border-radius:4px;padding:12px;
    font:500 13.5px/1.5 Manrope,sans-serif;color:var(--navy);resize:vertical;min-height:76px}
  .rec-block textarea:focus{outline:2px solid var(--blue);outline-offset:1px;border-color:var(--blue)}
  .rec-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:10px}
  .rec-row button{border:0;border-radius:4px;background:var(--blue);color:#fff;padding:11px 15px;
    font:800 11.5px Manrope,sans-serif;cursor:pointer}
  .rec-row button:hover{background:#163dae}
  .rec-row button[disabled]{opacity:.5;cursor:default}
  .rec-row small{color:#8a99a8;font-size:11.5px}

  .rec-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:11px}
  .rec-chips button{border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:999px;
    padding:8px 12px;font:700 11.5px Manrope,sans-serif;cursor:pointer;text-align:left}
  .rec-chips button:hover{border-color:var(--blue);color:var(--blue)}

  .rec-answer{margin-top:12px;padding:13px 15px;border-radius:4px;background:#eef7f5;
    border-left:3px solid var(--teal);font-size:13px;line-height:1.6;color:#24665f}
  .rec-answer.thin{background:#f6f8fa;border-left-color:#b9c8d6;color:#48596b}
  .rec-answer b{display:block;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;
    margin-bottom:5px;color:var(--teal)}
  .rec-answer.thin b{color:#8a99a8}
  .rec-done{margin-top:11px;padding:11px 14px;border-radius:4px;background:#e3f2ee;
    color:#1a5c54;font-size:12.5px;line-height:1.5}
</style>`, '.tl-item');

/* ---------------- behaviour ---------------- */

swap(`        buildGate(row, f);`,
`        buildGate(row, f);
        buildRecordLink(row, f);`, 'buildRecordLink(row, f);');

swap(`    /* ---------- the closure gate ----------`,
`    /* ---------- the case record ----------

       The overlay shell is the one the demo cases already use. Live cases fill it from the
       server so there is one detail view rather than two that drift apart. */

    function buildRecordLink(row, f) {
      const wrap = document.createElement('div');
      wrap.className = 'rec-open';
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Open the case record →';
      b.addEventListener('click', (e) => { e.stopPropagation(); openRecord(f); });
      wrap.appendChild(b);
      row.appendChild(wrap);
    }

    async function openRecord(f) {
      const ov = document.querySelector('#detailOverlay');
      const set = (sel, html) => { const el = ov.querySelector(sel); if (el) el.innerHTML = html; };

      set('#detailStatus', 'Case record');
      set('#detailTitle', EA.esc(f.title || 'Your grievance'));
      set('#detailSummary', 'Loading the record…');
      set('#detailFacts', '');
      set('#detailHolder', '');
      set('#detailClock', '');
      set('#timeline', '');
      set('#remedy', '');
      set('#followupBox', '');
      ov.classList.add('open');
      ov.querySelector('.detail-card').scrollTop = 0;

      const res = await window.EAAPI.timeline(f.id);
      if (res.error) { set('#detailSummary', EA.esc(res.error)); return; }
      const c = res.case;

      set('#detailStatus', 'Case record · ' + EA.esc(c.code));
      set('#detailTitle', EA.esc(c.title || 'Your grievance'));
      set('#detailSummary', EA.esc(c.summary || 'Filed in your own words.'));

      const facts = [
        ['With', c.office || 'Awaiting routing'],
        ['Filed', c.filedOn ? onDate(c.filedOn) : '—'],
        [c.status === 'confirmed_fixed' ? 'Closed' : 'Clock', c.status === 'confirmed_fixed'
          ? (c.confirmedOn ? onDate(c.confirmedOn) : 'confirmed') : (c.clock || 'not started')],
        ['Status', STATUS[c.status] || c.status],
        ['Visibility', c.visibility === 'private' ? 'Private to you' : 'Public — others can join'],
        ['On this case', c.supporters + (c.supporters === 1 ? ' household' : ' households')]
      ];
      set('#detailFacts', facts.map(([k, v]) =>
        '<div><small>' + EA.esc(k) + '</small><b>' + EA.esc(v) + '</b></div>').join(''));

      if (c.reason || c.legalBasis) {
        set('#detailHolder', '<p class="holder-eyebrow">Why this office</p><b>' + EA.esc(c.office || '—') + '</b>'
          + (c.reason ? '<span class="holder-where">' + EA.esc(c.reason) + '</span>' : '')
          + (c.legalBasis ? '<div class="holder-grid"><div><small>Basis</small><p>' + EA.esc(c.legalBasis) + '</p></div></div>' : ''));
      }

      set('#timeline', '<div class="tl">' + res.events.map((e) =>
        '<div class="tl-item ' + (e.tone === 'current' ? 'current' : '') + '">'
        + '<strong>' + EA.esc(e.title) + '</strong>'
        + (e.date ? '<time>' + EA.esc(onDate(e.date)) + '</time>' : '<time>now</time>')
        + '<p>' + EA.esc(e.body) + '</p></div>').join('') + '</div>');

      renderRecordActions(ov.querySelector('#followupBox'), c);
    }

    function renderRecordActions(box, c) {
      const closed = c.status === 'confirmed_fixed';
      const QS = [
        'Which office is holding this, and what can they actually do?',
        'How many days do they have left?',
        'What can I do if they miss it?',
        'What exactly did the office say?'
      ];

      box.innerHTML =
        '<div class="rec-block"><p class="eyebrow">Ask about this case</p>'
        + '<h3>Anything you want to know</h3>'
        + '<p>Answered only from what is recorded on this case. If the record does not hold the answer, I will say so rather than guess.</p>'
        + '<div class="rec-chips">' + QS.map((q, i) => '<button type="button" data-q="' + i + '">' + q + '</button>').join('') + '</div>'
        + '<textarea id="recAsk" placeholder="Or type your own question"></textarea>'
        + '<div class="rec-row"><button type="button" id="recAskGo">Ask</button>'
        + '<small>Your question is not sent to any officer.</small></div>'
        + '<div id="recAnswer"></div></div>'

        + '<div class="rec-block"><p class="eyebrow">Answer the office</p>'
        + '<h3>' + (closed ? 'This case is closed' : 'Say it in your own words') + '</h3>'
        + (closed
            ? '<p>You confirmed this fixed, so there is nothing waiting on either side. If the problem comes back, report it and the recurrence is counted.</p>'
            : '<p>If their report does not match what you see, write that here. It goes on the case record'
              + (c.status === 'awaiting_confirmation' ? ' and puts the case back with the office.' : '.') + '</p>'
              + '<textarea id="recReply" placeholder="Example: the stretch they repaired is not the stretch I reported"></textarea>'
              + '<div class="rec-row"><button type="button" id="recReplyGo">Send to the case</button>'
              + '<small>Never shown on a public case.</small></div>'
              + '<div id="recReplyOut"></div>')
        + '</div>';

      const ask = box.querySelector('#recAsk');
      const answer = box.querySelector('#recAnswer');
      box.querySelectorAll('.rec-chips button').forEach((b) =>
        b.addEventListener('click', () => { ask.value = QS[b.dataset.q]; doAsk(); }));

      async function doAsk() {
        const q = ask.value.trim();
        if (!q) { ask.focus(); return; }
        const go = box.querySelector('#recAskGo');
        go.disabled = true; go.textContent = 'Reading the record…';
        const res = await window.EAAPI.askCase(c.code, q);
        go.disabled = false; go.textContent = 'Ask';
        if (res.error) {
          answer.innerHTML = '<div class="rec-answer thin"><b>Could not answer</b>' + EA.esc(res.error) + '</div>';
          return;
        }
        /* Say where the answer came from. A refusal should read as a refusal. */
        const thin = res.source !== 'model';
        answer.innerHTML = '<div class="rec-answer ' + (thin ? 'thin' : '') + '"><b>'
          + (thin ? 'The record does not cover this' : 'From the case record')
          + '</b>' + EA.esc(res.answer) + '</div>';
      }
      box.querySelector('#recAskGo').addEventListener('click', doAsk);

      const rep = box.querySelector('#recReply');
      if (!rep) return;
      box.querySelector('#recReplyGo').addEventListener('click', async () => {
        const text = rep.value.trim();
        const out = box.querySelector('#recReplyOut');
        if (text.length < 4) { rep.focus(); return; }
        const go = box.querySelector('#recReplyGo');
        go.disabled = true; go.textContent = 'Sending…';
        const res = await window.EAAPI.replyToCase(c.code, state.phone, state.otp || '123456', text);
        go.disabled = false; go.textContent = 'Send to the case';
        if (res.error) {
          out.innerHTML = '<div class="rec-answer thin"><b>Not sent</b>' + EA.esc(res.error) + '</div>';
          return;
        }
        rep.value = '';
        out.innerHTML = '<p class="rec-done">' + EA.esc(res.message) + '</p>';
        /* the record has changed, so reopen it rather than leaving a stale timeline */
        openRecord({ id: c.code, title: c.title });
      });
    }

    /* ---------- the closure gate ----------`, 'async function openRecord(f)');

fs.writeFileSync(F, h);
console.log('my-cases.html  ' + n + ' edits');

/* ---------------- api client ---------------- */

const API = 'public/api-client.js';
let a = fs.readFileSync(API, 'utf8');
if (a.includes('timeline:')) {
  console.log('  = api-client already has the record calls');
} else {
  const anchor = `    myCases: (phone) => call('/me/' + encodeURIComponent(phone)),`;
  a = a.replace(anchor, `    /* The case record — every event, plus the two things a citizen can do about it. */
    timeline: (code) => call('/cases/' + encodeURIComponent(code) + '/timeline'),
    replyToCase: (code, phone, otp, text) =>
      call('/cases/' + encodeURIComponent(code) + '/reply', { method: 'POST', body: { phone, otp, text } }),
    askCase: (code, question) =>
      call('/cases/' + encodeURIComponent(code) + '/ask', { method: 'POST', body: { question } }),

${anchor}`);
  fs.writeFileSync(API, a);
  console.log('api-client.js updated');
}
