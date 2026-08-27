/* Ask for a name once, on the first login, and never again.

   Everything else about a person is derivable from the grievances they filed — where they
   are, which offices their cases reached, what they already told us. A name is the one
   thing that is not, so it is the one thing worth asking for, and only once.

   It is deliberately skippable. The whole argument of this project is that a citizen should
   not have to clear a form before being heard, and gating login on a name would be the same
   mistake in a smaller place. Skip once and the server records that we asked, so the step
   does not come back. */

import fs from 'node:fs';

const F = 'public/session.js';
let s = fs.readFileSync(F, 'utf8');
let n = 0;
const swap = (a, b, marker) => {
  if (marker && s.includes(marker)) { console.log('  = already applied'); return; }
  if (!s.includes(a)) { console.log('  ! miss: ' + a.slice(0, 55)); return; }
  s = s.replace(a, b); n++;
};

/* ---- API client needs the two new calls ---- */
const API = 'public/api-client.js';
let c = fs.readFileSync(API, 'utf8');
if (!c.includes('setName:')) {
  const anchor = `    myCases: (phone) => call('/me/' + encodeURIComponent(phone)),`;
  if (!c.includes(anchor)) { console.log('  ! api-client anchor missing'); }
  else {
    c = c.replace(anchor, `    myCases: (phone) => call('/me/' + encodeURIComponent(phone)),

    /* The one fact no grievance can supply. Optional — nothing is gated on it. */
    setName: (phone, otp, name) =>
      call('/me/' + encodeURIComponent(phone) + '/name', { method: 'POST', body: { otp, name } }),`);
    fs.writeFileSync(API, c);
    console.log('api-client.js updated');
  }
} else console.log('  = api-client already has setName');

/* ---- the name step, between OTP and done ---- */

swap(
  `        clearInterval(tick);
        patch({ loggedIn: true, phone: phone, otp: code });
        done();`,
  `        clearInterval(tick);
        patch({ loggedIn: true, phone: phone, otp: code });
        nameStep(code);`,
  'nameStep(code);');

swap(
  `      card.querySelector('#eaGo').addEventListener('click', verify);
      card.querySelector('#eaEdit').addEventListener('click', phoneStep);
    }`,
  `      card.querySelector('#eaGo').addEventListener('click', verify);
      card.querySelector('#eaEdit').addEventListener('click', phoneStep);
    }

    /* Asked once. The server already holds a name for a returning number, and it holds a row
       for anyone who skipped, so neither is asked twice. If the check cannot be made we go
       straight through rather than risk asking a returning citizen their own name again. */
    async function nameStep(code) {
      const known = read().name;
      if (known) { done(); return; }
      if (!window.EAAPI) { done(); return; }

      const res = await window.EAAPI.myCases(phone);
      const p = res && res.profile;
      if (!p || p.hasName) {
        if (p && p.person && p.person.name) patch({ name: p.person.name });
        done();
        return;
      }
      /* A returning number that has filed before was asked at its first login. */
      if (p.counts && (p.counts.filed > 0 || p.counts.supported > 0)) { done(); return; }

      paint('<p class="ea-eyebrow">Last thing</p><h2>What should I call you?</h2>'
        + '<p class="ea-sub">Only so I can address you properly. It is never shown on a public case, and you can skip it.</p>'
        + '<label class="ea-label" for="eaName">Your name</label>'
        + '<input id="eaName" type="text" maxlength="60" placeholder="First name is enough" autocomplete="given-name" />'
        + '<p class="ea-err" id="eaErr">That did not look like a name.</p>'
        + '<p class="ea-hint">Everything else — where you are, which office holds your case — I work out from what you tell me about the problem. I will not ask you for it again.</p>'
        + '<div class="ea-foot"><button class="ea-back" type="button" id="eaSkip">Skip this</button>'
        + '<button class="ea-btn" type="button" id="eaGo">Save&nbsp; →</button></div>');

      const input = card.querySelector('#eaName'), err = card.querySelector('#eaErr');
      const finish = (name) => { if (name) patch({ name: name }); done(); };

      card.querySelector('#eaSkip').addEventListener('click', () => finish(null));
      const save = async () => {
        const name = input.value.trim();
        if (!name) { finish(null); return; }
        const out = await window.EAAPI.setName(phone, code, name);
        if (out.error && !out.offline) { err.textContent = out.error; err.classList.add('show'); return; }
        finish((out.person && out.person.name) || name);
      };
      card.querySelector('#eaGo').addEventListener('click', save);
      input.addEventListener('input', () => err.classList.remove('show'));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    }`,
  'What should I call you?');

/* the blank session gains a name slot */
swap(
  `  const blank = { loggedIn: false, phone: '', filed: [], joined: [], draft: null };`,
  `  const blank = { loggedIn: false, phone: '', name: '', filed: [], joined: [], draft: null };`,
  `name: '', filed: []`);

/* logout should forget the name too */
swap(
  `    logout: function () { patch({ loggedIn: false, otp: '' }); },`,
  `    logout: function () { patch({ loggedIn: false, otp: '', name: '' }); },`,
  `otp: '', name: '' }`);

fs.writeFileSync(F, s);
console.log('session.js  ' + n + ' edits');
