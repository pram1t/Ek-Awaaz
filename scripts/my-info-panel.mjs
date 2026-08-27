/* "My information" — everything the system knows, and where each part came from.

   The complaint that started this project is that the existing portal asks for the same
   details every single time. So this panel is not a profile form. It is a view of the
   grievances already filed, and every line names the grievance it came from. That is both
   the honest presentation and the entire argument: nothing here was asked twice.

   Deliberate choices:
   - a fact seen across sixteen grievances reads as one fact seen sixteen times, not as
     sixteen case numbers;
   - the mobile number is masked even to its owner, because a shoulder is a shoulder;
   - there is no edit control. These are not settings, they are things the citizen said, and
     the place to correct one is the grievance it came from. */

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
  .info{background:#fff;border:1px solid var(--line);border-radius:6px;padding:26px 28px;margin-bottom:26px}
  .info-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap}
  .info-who h2{font-size:26px;margin:6px 0 4px}
  .info-who p{margin:0;color:var(--muted);font-size:13px}
  .info-who .add-name{border:1px dashed #9db4ca;background:#f6f8fa;color:var(--navy);border-radius:4px;
    padding:7px 11px;font:800 11px Manrope,sans-serif;cursor:pointer;margin-top:9px}
  .info-who .add-name:hover{border-color:var(--blue);color:var(--blue)}

  .tally{display:flex;gap:10px;flex-wrap:wrap}
  .tally div{background:#f1f5f8;border-radius:4px;padding:11px 14px;min-width:88px}
  .tally b{display:block;color:var(--navy);font-size:22px;line-height:1.1;font-weight:800}
  .tally small{display:block;color:var(--muted);font-size:10px;letter-spacing:.07em;
    text-transform:uppercase;font-weight:800;margin-top:4px}
  .tally div.flag b{color:var(--amber)}

  .info-claim{margin:20px 0 0;padding:12px 15px;background:#eef7f5;border-left:3px solid var(--teal);
    font-size:13px;line-height:1.6;color:#24665f}
  .info-claim b{color:var(--teal)}

  .info-group{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
  .info-group>p.eyebrow{margin-bottom:12px}
  .facts{display:grid;gap:9px}
  .fact-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:baseline;
    padding:11px 13px;background:#f8fafc;border-radius:4px}
  .fact-row .k{display:block;font-size:10px;letter-spacing:.07em;text-transform:uppercase;
    color:#8a99a8;font-weight:800;margin-bottom:4px}
  .fact-row .v{display:block;color:var(--navy);font-size:13.5px;font-weight:700;line-height:1.45}
  .fact-row .src{text-align:right;white-space:nowrap;color:#8a99a8;font-size:11px;line-height:1.5}
  .fact-row .src b{display:block;color:var(--muted);font-weight:700}
  .info-none{color:var(--muted);font-size:13px;margin:0}
  @media(max-width:760px){
    .fact-row{grid-template-columns:1fr}
    .fact-row .src{text-align:left}
    .info{padding:20px 18px}
  }
</style>`, '.info-claim');

/* ---------------- behaviour ---------------- */

swap(`    if (joined.length) {`,
`    /* ---------- My information ----------
       Rendered from the same /me payload the case list uses, so it cannot disagree with the
       cases it describes. */
    if (live && res_profile) renderInfo(res_profile);

    function renderInfo(p) {
      const mask = state.phone ? '+91 ' + state.phone.slice(0, 2) + ' ***** ' + state.phone.slice(-3) : '';
      const name = (p.person && p.person.name) || state.name || null;

      const box = document.createElement('section');
      box.className = 'info';

      const tally = [
        ['filed', p.counts.filed, 'Filed'],
        ['supported', p.counts.supported, 'Supported'],
        ['fixed', p.counts.confirmedFixed, 'Confirmed fixed'],
        ['reopened', p.counts.reopened, 'Reopened'],
        ['awaiting', p.counts.awaitingYou, 'Waiting on you']
      ].filter(([, v]) => v > 0);

      box.innerHTML =
        '<div class="info-top"><div class="info-who">'
          + '<p class="eyebrow">My information</p>'
          + '<h2>' + (name ? EA.esc(name) : 'Signed in') + '</h2>'
          + '<p>' + EA.esc(mask) + (p.person && p.person.since ? ' · with Ek Awaaz since ' + onDate(p.person.since) : '') + '</p>'
          + (name ? '' : '<button class="add-name" type="button" id="addName">Tell me what to call you</button>')
        + '</div><div class="tally">'
          + tally.map(([k, v, label]) =>
              '<div class="' + (k === 'awaiting' || k === 'reopened' ? 'flag' : '') + '"><b>' + v + '</b><small>' + label + '</small></div>').join('')
        + '</div></div>'
        + '<p class="info-claim"><b>You were never asked for any of this.</b> Every line below came out of a grievance you already described, and each one says which. Nothing here was typed into a form twice.</p>'
        + group('Where you are', p.places)
        + group('Offices your cases have reached', p.offices)
        + group('Things you have told us', p.said)
        + supportedGroup(p.supported);

      const main = document.querySelector('.main > .shell');
      const bar = main.querySelector('.page-bar');
      if (bar) bar.after(box); else main.prepend(box);

      const add = box.querySelector('#addName');
      if (add) add.addEventListener('click', askName);
    }

    function group(title, rows) {
      if (!rows || !rows.length) return '';
      return '<div class="info-group"><p class="eyebrow">' + EA.esc(title) + '</p><div class="facts">'
        + rows.map((f) =>
            '<div class="fact-row"><div><span class="k">' + EA.esc(f.label) + '</span>'
            + '<span class="v">' + EA.esc(f.value) + '</span></div>'
            + '<div class="src">from<b>' + EA.esc(f.from) + '</b>'
            + (f.alsoCount ? '<span>and ' + f.alsoCount + ' other grievance' + (f.alsoCount === 1 ? '' : 's') + '</span>' : '')
            + '</div></div>').join('')
        + '</div></div>';
    }

    function supportedGroup(rows) {
      if (!rows || !rows.length) return '';
      return '<div class="info-group"><p class="eyebrow">Cases you added your name to</p><div class="facts">'
        + rows.map((s) =>
            '<div class="fact-row"><div><span class="k">' + EA.esc(s.area || 'Public case') + '</span>'
            + '<span class="v">' + EA.esc(s.title) + '</span></div>'
            + '<div class="src">joined<b>' + EA.esc(onDate(s.on)) + '</b><span>' + EA.esc(s.code) + '</span></div></div>').join('')
        + '</div></div>';
    }

    /* The name is the only thing here that is asked for rather than derived, so it is the
       only thing with a control. */
    async function askName() {
      const name = window.prompt('What should I call you? A first name is enough.');
      if (name === null) return;
      const clean = String(name).trim();
      if (!clean) return;
      const out = await window.EAAPI.setName(state.phone, state.otp || '123456', clean);
      if (out.error) { window.alert(out.error); return; }
      EA.patch({ name: out.person.name });
      window.location.reload();
    }

    if (joined.length) {`, 'function renderInfo(p)');

/* the profile has to survive out of the fetch */
swap(`    let filed = state.filed, joined = state.joined, live = false;`,
     `    let filed = state.filed, joined = state.joined, live = false, res_profile = null;`,
     'res_profile = null');

swap(`        live = true;`,
     `        live = true;
        res_profile = res.profile || null;`,
     'res_profile = res.profile');

fs.writeFileSync(F, h);
console.log('my-cases.html  ' + n + ' edits');
