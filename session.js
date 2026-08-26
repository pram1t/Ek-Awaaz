/* Ek Awaaz — shared session, login and join-a-case flow.
   Session lives in sessionStorage: it survives a refresh and clears when the tab closes. */
(function () {
  const KEY = 'ekawaaz.session';
  const blank = { loggedIn: false, phone: '', filed: [], joined: [], draft: null };

  function read() {
    try { return Object.assign({}, blank, JSON.parse(sessionStorage.getItem(KEY) || '{}')); }
    catch (e) { return Object.assign({}, blank); }
  }
  function write(next) { sessionStorage.setItem(KEY, JSON.stringify(next)); return next; }
  function patch(changes) { return write(Object.assign(read(), changes)); }

  const esc = (t) => String(t == null ? '' : t).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const digits = (t) => String(t || '').replace(/\D/g, '');

  /* Public cases people can join. Follow-ups are specific to the problem in each case. */
  const registry = {
    '2026-04412': {
      id: 'EA–2026–04412', title: 'Road damage, Rajnagar Ward 4', area: 'Rajnagar Ward 4, Patna district',
      office: 'Block Development Officer, Rajnagar block', supporters: 34, target: 50, day: 'Day 4 of 21',
      remedy: 'District Magistrate', asks: [
        { q: 'Which stretch is worst near you?', hint: 'A landmark is enough — the school turning, the handpump, the bus stop.', ph: 'Example: the 40 m before the primary school gate' },
        { q: 'Has this road caused you a loss or an injury?', hint: 'A fall, a damaged vehicle, an ambulance or school van that could not pass.', ph: 'Example: my scooter axle broke on 4 August' }
      ]
    },
    '2026-04108': {
      id: 'EA–2026–04108', title: 'Water supply interruption', area: 'Ward 9, Patna district',
      office: 'District water office', supporters: 18, target: 40, day: 'Awaiting routing',
      remedy: 'Municipal Commissioner', asks: [
        { q: 'How many days a week does your supply fail?', hint: 'And roughly at which hours, if there is a pattern.', ph: 'Example: four days a week, nothing after 7 am' },
        { q: 'Where are you getting water from meanwhile?', hint: 'A tanker, a neighbour’s connection, a handpump, purchased cans.', ph: 'Example: buying two 20-litre cans a day' }
      ]
    },
    '2026-04871': {
      id: 'EA–2026–04871', title: 'Burnt-out transformer, Kanjhawala feeder', area: 'Kanjhawala feeder, 11 streets',
      office: 'Discom Executive Engineer', supporters: 63, target: 80, day: 'Resolved 14 May 2026',
      remedy: 'State Electricity Regulatory Commission', asks: [
        { q: 'How many hours a day is your supply out?', hint: 'Give the worst stretch you have had this week.', ph: 'Example: 9 hours, mostly 6 pm to 3 am' },
        { q: 'Has the outage damaged anything or stopped work?', hint: 'A burnt appliance, spoiled stock, a shop or clinic that had to close.', ph: 'Example: refrigerator compressor burnt, ₹6,000' }
      ]
    },
    '2026-05230': {
      id: 'EA–2026–05230', title: 'Street lights out, NH-44 km 118–121', area: 'NH-44, km 118 to 121',
      office: 'NHAI Project Director', supporters: 128, target: 150, day: 'Resolved 9 June 2026',
      remedy: 'NHAI Regional Officer', asks: [
        { q: 'Which km marker do you use, and at what time?', hint: 'The bend, the service road entry, the crossing you take after dark.', ph: 'Example: km 119 service road entry, around 8 pm daily' },
        { q: 'Have you seen a crash or a near miss on this stretch?', hint: 'A date and what happened is enough. Say no if you have not.', ph: 'Example: two-wheeler hit the divider on 12 May' }
      ]
    },
    '2026-05604': {
      id: 'EA–2026–05604', title: 'Anganwadi kendra roof, Barkheda village', area: 'Barkheda village',
      office: 'Child Development Project Officer', supporters: 32, target: 45, day: 'Resolved 28 July 2026',
      remedy: 'District Programme Officer', asks: [
        { q: 'How many children from your household attend the kendra?', hint: 'And whether they have stopped going because of the building.', ph: 'Example: two children, both kept home since June' },
        { q: 'What are the children doing now instead?', hint: 'Sitting outside, sent to another kendra, or not attending at all.', ph: 'Example: sitting under the neem tree; no meal on rain days' }
      ]
    }
  };

  function lookup(input) {
    const d = digits(input);
    if (d.length < 5) return null;
    const key = Object.keys(registry).find((k) => {
      const full = digits(k);
      return d === full || d.endsWith(full) || (d.length >= 5 && full.endsWith(d.slice(-5)));
    });
    return key ? Object.assign({ key }, registry[key]) : null;
  }

  /* ---------- overlay shell ---------- */
  const css = `
  .ea-scrim{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;padding:22px;background:#102a43e0;backdrop-filter:blur(3px)}
  .ea-scrim.open{display:flex}
  .ea-card{width:min(100%,520px);max-height:90vh;overflow:auto;background:#fff;border-radius:6px;padding:30px 32px 28px;position:relative;font:15px/1.55 Manrope,Arial,sans-serif;color:#24313f;box-shadow:0 26px 70px #06172b66}
  .ea-x{position:absolute;right:14px;top:11px;border:0;background:none;font-size:22px;line-height:1;color:#8a99a8;cursor:pointer}
  .ea-x:hover{color:#102a43}
  .ea-eyebrow{color:#1d4ed8;font:800 11px Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;margin:0 0 9px}
  .ea-card h2{color:#102a43;font:700 25px/1.2 Manrope,sans-serif;letter-spacing:-.025em;margin:0 0 9px}
  .ea-card p.ea-sub{color:#5d6b79;font-size:14px;margin:0;text-wrap:pretty}
  .ea-strip{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin:0 0 22px}
  .ea-strip i{height:4px;border-radius:2px;background:#e6ecf2}
  .ea-strip i.on{background:#1d4ed8}
  .ea-case{margin:18px 0 0;padding:14px 16px;background:#f4f7fa;border-radius:4px}
  .ea-case b{display:block;color:#102a43;font-size:14.5px}
  .ea-case span{display:block;color:#5d6b79;font-size:12.5px;margin-top:3px}
  .ea-label{display:block;color:#102a43;font:800 11px Manrope,sans-serif;letter-spacing:.08em;text-transform:uppercase;margin:24px 0 8px}
  .ea-card textarea,.ea-card input{width:100%;font:15px/1.5 Manrope,Arial,sans-serif;color:#102a43;padding:13px 14px;border:1px solid #b9c8d6;border-radius:4px;background:#fff}
  .ea-card textarea{min-height:92px;resize:vertical}
  .ea-card textarea:focus,.ea-card input:focus{outline:0;border-color:#1d4ed8}
  .ea-hint{color:#5d6b79;font-size:12.5px;margin:9px 0 0}
  .ea-err{color:#9f1239;font:700 12.5px Manrope,sans-serif;margin:10px 0 0;display:none}
  .ea-err.show{display:block}
  .ea-drop{margin-top:10px;border:1px dashed #b9c8d6;border-radius:4px;padding:18px;text-align:center;background:#fbfcfd}
  .ea-drop.over{border-color:#1d4ed8;background:#f2f7ff}
  .ea-drop p{margin:0 0 12px;color:#5d6b79;font-size:13px}
  .ea-ghost{border:1px solid #b9c8d6;background:#fff;color:#102a43;border-radius:4px;padding:10px 14px;font:800 11.5px Manrope,sans-serif;cursor:pointer}
  .ea-ghost:hover{border-color:#1d4ed8;color:#1d4ed8}
  .ea-row{display:flex;gap:9px;justify-content:center;flex-wrap:wrap}
  .ea-files{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:6px}
  .ea-files li{display:flex;align-items:center;gap:10px;padding:9px 11px;background:#f4f7fa;border-radius:4px;font-size:12.5px}
  .ea-files li b{color:#102a43;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ea-files li span{color:#5d6b79;margin-left:auto;white-space:nowrap}
  .ea-files li button{border:0;background:none;color:#5d6b79;font-size:15px;cursor:pointer}
  .ea-none{display:flex;align-items:center;gap:9px;margin:13px 0 0;font-size:13px;color:#102a43;cursor:pointer}
  .ea-none input{width:16px;height:16px;flex:0 0 16px}
  .ea-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:26px;padding-top:20px;border-top:1px solid #e6ecf2;flex-wrap:wrap}
  .ea-foot small{color:#8a99a8;font-size:11.5px;flex:1 1 170px}
  .ea-btn{border:0;border-radius:4px;padding:14px 20px;background:#1d4ed8;color:#fff;font:800 13px Manrope,sans-serif;cursor:pointer;text-decoration:none;display:inline-block}
  .ea-btn:hover{background:#1740b8;color:#fff}
  .ea-back{border:0;background:none;color:#5d6b79;font:800 12px Manrope,sans-serif;cursor:pointer;padding:0}
  .ea-back:hover{color:#102a43}
  .ea-otp{display:flex;gap:9px;margin-top:9px}
  .ea-otp input{width:100%;text-align:center;font:800 20px Manrope,sans-serif;padding:13px 0;letter-spacing:0}
  .ea-tick{width:46px;height:46px;border-radius:50%;background:#e3f2ee;color:#0f766e;display:grid;place-items:center;font-size:22px;margin-bottom:14px}
  .ea-dl{display:grid;gap:1px;margin:18px 0 0;background:#e6ecf2;border-radius:4px;overflow:hidden}
  .ea-dl>div{display:flex;justify-content:space-between;gap:14px;background:#fff;padding:12px 14px}
  .ea-dl dt{color:#8a99a8;font:800 10.5px Manrope,sans-serif;letter-spacing:.08em;text-transform:uppercase;margin:0}
  .ea-dl dd{margin:0;color:#102a43;font-weight:700;font-size:13.5px;text-align:right}
  .ea-meter{height:6px;border-radius:3px;background:#e6ecf2;overflow:hidden;margin-top:16px}
  .ea-meter i{display:block;height:100%;background:#1d4ed8}
  @media(max-width:520px){.ea-card{padding:24px 20px}.ea-card h2{font-size:22px}}`;

  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  const scrim = document.createElement('div');
  scrim.className = 'ea-scrim';
  scrim.setAttribute('role', 'dialog');
  scrim.setAttribute('aria-modal', 'true');
  scrim.innerHTML = '<div class="ea-card" id="eaCard"></div>';
  /* The tag may sit in <head>, so wait for a body before mounting. */
  if (document.body) document.body.appendChild(scrim);
  else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(scrim));
  const card = scrim.querySelector('#eaCard');

  let onClose = null;
  function open() { scrim.classList.add('open'); }
  function close() { scrim.classList.remove('open'); card.innerHTML = ''; if (onClose) { const f = onClose; onClose = null; f(); } }
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && scrim.classList.contains('open')) close(); });

  function paint(html) {
    card.innerHTML = '<button class="ea-x" type="button" aria-label="Close">×</button>' + html;
    card.querySelector('.ea-x').addEventListener('click', close);
    open();
    const focusable = card.querySelector('textarea, input');
    if (focusable) setTimeout(() => focusable.focus(), 60);
  }
  const strip = (total, at) => '<div class="ea-strip">' + Array.from({ length: total }, (_, i) => '<i class="' + (i <= at ? 'on' : '') + '"></i>').join('') + '</div>';

  /* ---------- login: mobile number, then OTP ---------- */
  function login(done, context) {
    const reason = context || 'Your grievances are tied to your mobile number.';
    let phone = '';

    function phoneStep() {
      paint('<p class="ea-eyebrow">Log in</p><h2>Enter your mobile number</h2><p class="ea-sub">' + esc(reason) + ' No password, no Aadhaar.</p>'
        + '<label class="ea-label" for="eaPhone">Mobile number</label><input id="eaPhone" type="tel" inputmode="numeric" maxlength="14" placeholder="10-digit mobile number" />'
        + '<p class="ea-err" id="eaErr">Enter a 10-digit mobile number.</p>'
        + '<p class="ea-hint">We send a one-time code to this number. It is never shown on a public case.</p>'
        + '<div class="ea-foot"><small>Prototype: no real message is sent.</small><button class="ea-btn" type="button" id="eaGo">Send code&nbsp; →</button></div>');
      const input = card.querySelector('#eaPhone'), err = card.querySelector('#eaErr');
      input.value = read().phone || '';
      const go = () => {
        const d = digits(input.value);
        if (d.length !== 10) { err.classList.add('show'); input.focus(); return; }
        phone = d;
        otpStep();
      };
      card.querySelector('#eaGo').addEventListener('click', go);
      input.addEventListener('input', () => err.classList.remove('show'));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    }

    function otpStep() {
      paint('<p class="ea-eyebrow">Log in</p><h2>Enter the 6-digit code</h2><p class="ea-sub">Sent to +91 ' + phone.slice(0, 5) + ' ' + phone.slice(5) + '. <button class="ea-back" type="button" id="eaEdit">Change number</button></p>'
        + '<div class="ea-otp">' + Array.from({ length: 6 }, () => '<input type="text" inputmode="numeric" maxlength="1" aria-label="Code digit" />').join('') + '</div>'
        + '<p class="ea-err" id="eaErr">Enter all six digits.</p>'
        + '<p class="ea-hint">Prototype: any six digits will verify. <span id="eaResend">Resend code in 30s</span></p>'
        + '<div class="ea-foot"><small>Your number is used for case updates only.</small><button class="ea-btn" type="button" id="eaGo">Verify&nbsp; →</button></div>');
      const boxes = [...card.querySelectorAll('.ea-otp input')], err = card.querySelector('#eaErr');
      boxes.forEach((box, i) => {
        box.addEventListener('input', () => {
          box.value = digits(box.value).slice(0, 1);
          err.classList.remove('show');
          if (box.value && boxes[i + 1]) boxes[i + 1].focus();
          if (boxes.every((b) => b.value)) verify();
        });
        box.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !box.value && boxes[i - 1]) boxes[i - 1].focus(); if (e.key === 'Enter') verify(); });
        box.addEventListener('paste', (e) => {
          const d = digits((e.clipboardData || window.clipboardData).getData('text')).slice(0, 6);
          if (!d) return;
          e.preventDefault();
          d.split('').forEach((c, k) => { if (boxes[k]) boxes[k].value = c; });
          if (d.length === 6) verify(); else boxes[Math.min(d.length, 5)].focus();
        });
      });
      let left = 30;
      const resend = card.querySelector('#eaResend');
      const tick = setInterval(() => {
        left -= 1;
        if (!document.body.contains(resend)) { clearInterval(tick); return; }
        resend.textContent = left > 0 ? 'Resend code in ' + left + 's' : 'Resend code';
        if (left <= 0) clearInterval(tick);
      }, 1000);
      function verify() {
        if (!boxes.every((b) => b.value)) { err.classList.add('show'); return; }
        clearInterval(tick);
        patch({ loggedIn: true, phone: phone });
        done();
      }
      card.querySelector('#eaGo').addEventListener('click', verify);
      card.querySelector('#eaEdit').addEventListener('click', phoneStep);
    }

    if (read().loggedIn) { done(); return; }
    phoneStep();
  }

  /* ---------- join a public case ---------- */
  function join(input, opts) {
    const found = lookup(input);
    if (!found) return { ok: false, reason: 'unknown' };
    const answers = [];
    const files = [];
    const questions = [{ q: 'What more can you add about this?', hint: 'Anything the case does not already say — what you see, how long, who it affects.', ph: 'Example: the same stretch floods every time it rains' }].concat(found.asks);
    const total = questions.length + 2;

    function caseStrip() {
      return '<div class="ea-case"><b>' + esc(found.title) + '</b><span>' + esc(found.id) + ' · ' + esc(found.area) + ' · ' + esc(found.supporters) + ' already supporting</span></div>';
    }

    function askStep(i) {
      const q = questions[i];
      paint(strip(total, i) + '<p class="ea-eyebrow">Joining a public case · ' + (i + 1) + ' of ' + total + '</p><h2>' + esc(q.q) + '</h2><p class="ea-sub">' + esc(q.hint) + '</p>'
        + (i === 0 ? caseStrip() : '')
        + '<label class="ea-label" for="eaAns">Your answer</label><textarea id="eaAns" placeholder="' + esc(q.ph) + '"></textarea>'
        + '<p class="ea-err" id="eaErr">This answer is needed before you can join.</p>'
        + '<div class="ea-foot">' + (i ? '<button class="ea-back" type="button" id="eaBack">← Back</button>' : '<small>Every answer strengthens the shared case.</small>')
        + '<button class="ea-btn" type="button" id="eaGo">Continue&nbsp; →</button></div>');
      const area = card.querySelector('#eaAns'), err = card.querySelector('#eaErr');
      area.value = answers[i] || '';
      area.addEventListener('input', () => err.classList.remove('show'));
      card.querySelector('#eaGo').addEventListener('click', () => {
        const value = area.value.trim();
        if (!value) { err.classList.add('show'); area.focus(); return; }
        answers[i] = value;
        if (i + 1 < questions.length) askStep(i + 1); else evidenceStep();
      });
      const back = card.querySelector('#eaBack');
      if (back) back.addEventListener('click', () => { answers[i] = area.value.trim(); askStep(i - 1); });
    }

    function evidenceStep() {
      paint(strip(total, questions.length) + '<p class="ea-eyebrow">Joining a public case · ' + (questions.length + 1) + ' of ' + total + '</p>'
        + '<h2>Any more images, videos, or supporting documents?</h2><p class="ea-sub">Photos of the same problem at your location, a bill, a receipt, or an earlier complaint letter.</p>'
        + '<div class="ea-drop" id="eaDrop"><p>Drag files here, or choose below.</p><div class="ea-row"><button class="ea-ghost" type="button" id="eaPhoto">Take or add a photo</button><button class="ea-ghost" type="button" id="eaVideo">Add a video</button><button class="ea-ghost" type="button" id="eaDoc">Choose a document</button></div></div>'
        + '<ul class="ea-files" id="eaFiles"></ul>'
        + '<label class="ea-none"><input type="checkbox" id="eaNone" /> I have nothing to attach right now</label>'
        + '<p class="ea-err" id="eaErr">Attach at least one file, or tick the box above.</p>'
        + '<input type="file" id="eaPhotoIn" accept="image/*" capture="environment" multiple hidden /><input type="file" id="eaVideoIn" accept="video/*" multiple hidden /><input type="file" id="eaDocIn" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple hidden />'
        + '<div class="ea-foot"><button class="ea-back" type="button" id="eaBack">← Back</button><button class="ea-btn" type="button" id="eaGo">Continue&nbsp; →</button></div>');
      const list = card.querySelector('#eaFiles'), err = card.querySelector('#eaErr'), none = card.querySelector('#eaNone'), drop = card.querySelector('#eaDrop');
      const size = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
      function render() {
        list.innerHTML = files.map((f, i) => '<li><b>' + esc(f.name) + '</b><span>' + size(f.size) + '</span><button type="button" data-i="' + i + '" aria-label="Remove">×</button></li>').join('');
        if (files.length) { none.checked = false; err.classList.remove('show'); }
      }
      list.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; files.splice(+b.dataset.i, 1); render(); });
      const add = (l) => { [...l].forEach((f) => files.push(f)); render(); };
      [['#eaPhoto', '#eaPhotoIn'], ['#eaVideo', '#eaVideoIn'], ['#eaDoc', '#eaDocIn']].forEach(([btn, inp]) => {
        card.querySelector(btn).addEventListener('click', () => card.querySelector(inp).click());
        card.querySelector(inp).addEventListener('change', (e) => add(e.target.files));
      });
      ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) add(e.dataTransfer.files); });
      none.addEventListener('change', () => { if (none.checked) err.classList.remove('show'); });
      render();
      card.querySelector('#eaGo').addEventListener('click', () => {
        if (!files.length && !none.checked) { err.classList.add('show'); return; }
        reviewStep();
      });
      card.querySelector('#eaBack').addEventListener('click', () => askStep(questions.length - 1));
    }

    function reviewStep() {
      const rows = questions.map((q, i) => '<div><dt>' + esc(q.q.replace(/\?$/, '')) + '</dt><dd>' + esc(answers[i]) + '</dd></div>').join('')
        + '<div><dt>Attached</dt><dd>' + (files.length ? files.length + (files.length === 1 ? ' file' : ' files') : 'Nothing attached') + '</dd></div>';
      paint(strip(total, total - 1) + '<p class="ea-eyebrow">Joining a public case · ' + total + ' of ' + total + '</p><h2>Add your support to this case</h2>'
        + '<p class="ea-sub">Your answers go to ' + esc(found.office) + ' as part of the same case. Nothing is sent until you confirm.</p>'
        + caseStrip() + '<dl class="ea-dl">' + rows + '</dl>'
        + '<div class="ea-foot"><button class="ea-back" type="button" id="eaBack">← Back</button><button class="ea-btn" type="button" id="eaGo">' + (read().loggedIn ? 'Add my support&nbsp; →' : 'Log in and add my support&nbsp; →') + '</button></div>');
      card.querySelector('#eaBack').addEventListener('click', evidenceStep);
      card.querySelector('#eaGo').addEventListener('click', () => {
        login(commit, 'One step left. Verify your number so your support is counted once.');
      });
    }

    function commit() {
      const state = read();
      const already = state.joined.some((j) => j.id === found.id);
      const entry = {
        id: found.id, title: found.title, office: found.office, area: found.area,
        supporters: found.supporters + (already ? 0 : 1), target: found.target,
        answers: answers.slice(), attachments: files.map((f) => f.name), at: Date.now()
      };
      if (!already) patch({ joined: state.joined.concat(entry) });
      doneStep(entry, already);
    }

    function doneStep(entry, already) {
      const pct = Math.min(100, Math.round((entry.supporters / entry.target) * 100));
      paint('<div class="ea-tick" aria-hidden="true">✓</div><p class="ea-eyebrow">Support added</p>'
        + '<h2>' + (already ? 'You already support this case.' : 'You are supporter ' + entry.supporters + ' of ' + entry.target + '.') + '</h2>'
        + '<p class="ea-sub">Your details were added to ' + esc(entry.id) + ', now with ' + esc(entry.office) + '. It is in <b>My grievances</b> under the cases you support.</p>'
        + '<div class="ea-meter"><i style="width:' + pct + '%"></i></div>'
        + '<div class="ea-foot"><small>Your name is never shown to other signatories.</small><a class="ea-btn" href="dashboard.html">Open my grievances&nbsp; →</a></div>');
      if (opts && opts.onDone) opts.onDone(entry, already);
    }

    askStep(0);
    return { ok: true, found: found };
  }

  function invalid(input) {
    paint('<p class="ea-eyebrow">Case not found</p><h2>That grievance number did not match.</h2>'
      + '<p class="ea-sub">We could not find a public case for <b>' + esc(String(input).slice(0, 24)) + '</b>. Check the number on your acknowledgement, or file a new case instead.</p>'
      + '<label class="ea-label" for="eaRetry">Public grievance number</label><input id="eaRetry" type="text" placeholder="Example: EA–2026–04412" />'
      + '<p class="ea-err" id="eaErr">Still no match. Check the digits and try again.</p>'
      + '<div class="ea-foot"><a class="ea-back" href="index.html#report">File a new case instead</a><button class="ea-btn" type="button" id="eaGo">Find case&nbsp; →</button></div>');
    const field = card.querySelector('#eaRetry'), err = card.querySelector('#eaErr');
    const go = () => { const r = join(field.value); if (!r.ok) { err.classList.add('show'); field.focus(); } };
    card.querySelector('#eaGo').addEventListener('click', go);
    field.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    field.addEventListener('input', () => err.classList.remove('show'));
  }

  window.EA = {
    read: read, patch: patch, registry: registry, lookup: lookup, esc: esc,
    login: login,
    logout: function () { patch({ loggedIn: false }); },
    close: close,
    /* Guard an action behind login; runs it straight away if the session is live. */
    require: function (reason, run) { login(run, reason); },
    join: function (input, opts) { const r = join(input, opts); if (!r.ok) invalid(input); return r; },
    /* Record a case filed through the lodging chat. */
    file: function (entry) {
      const state = read();
      const record = Object.assign({ id: 'EA–2026–' + (10000 + Math.floor(Math.random() * 89999)), at: Date.now() }, entry);
      patch({ filed: state.filed.concat(record), draft: null });
      return record;
    }
  };
})();
