/* Joining a case was five screens. That is the same friction as filing a fresh one, which
 * defeats the entire point: the case already exists, the office is already named, the problem is
 * already described. The only thing actually needed from a neighbour is their name — the count is
 * what moves the case to the District Collector, and the count needs one signature, not an essay.
 *
 * Three required questions also meant a person could be stopped from joining because they could
 * not think of anything to add about a road they walk on every day. A required field on a
 * voluntary act is a contradiction.
 *
 * So: one screen. The case, one optional line, an optional photo, and the button. Everything the
 * old flow demanded is still offered — the case-specific question becomes the placeholder in the
 * optional box, so a person who does have a detail is still prompted for the useful one — but
 * nothing blocks the signature.
 */

import fs from 'node:fs';

const F = 'public/session.js';
const lines = fs.readFileSync(F, 'utf8').split(/\r?\n/);

const at = (needle, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && l.includes(needle));
  if (i < 0) throw new Error('not found: ' + needle);
  return i;
};

if (lines.some((l) => l.includes('function oneStep()'))) {
  console.log('= already applied');
  process.exit(0);
}

const qLine = at('const questions = [');
const askStart = at('function askStep(i) {');
const sigComment = at('The signature is recorded on the server');
const callLine = at('askStep(0);');

/* ── the single screen ─────────────────────────────────────────────────────── */
const ONE = `    /* One screen. The case-specific question becomes the example inside the optional box: a
       person who has that detail is still asked for it, and a person who does not is not stopped. */
    const prompt = (found.asks && found.asks[0]) || null;

    function caseStrip() {
      return '<div class="ea-case"><b>' + esc(found.title) + '</b><span>' + esc(found.id) + ' · ' + esc(found.area) + ' · ' + esc(found.supporters) + ' people have joined</span></div>';
    }

    function oneStep() {
      paint('<p class="ea-eyebrow">Join this case</p>'
        + '<h2>Add your name to this case</h2>'
        + '<p class="ea-sub">This problem is already reported, so you do not have to explain it again. Your name adds to the count that makes the office act.</p>'
        + caseStrip()
        + '<label class="ea-label" for="eaAns">Anything to add? <span class="ea-opt">Optional</span></label>'
        + '<textarea id="eaAns" placeholder="' + esc(prompt ? prompt.ph : 'Example: the same stretch floods every time it rains') + '"></textarea>'
        + '<p class="ea-hint">' + esc(prompt ? prompt.q + ' ' + prompt.hint : 'Anything the case does not already say.') + '</p>'
        + '<div class="ea-row ea-attach"><button class="ea-ghost" type="button" id="eaPhoto">Add a photo</button><button class="ea-ghost" type="button" id="eaDoc">Add a file</button></div>'
        + '<ul class="ea-files" id="eaFiles"></ul>'
        + '<input type="file" id="eaPhotoIn" accept="image/*" capture="environment" multiple hidden /><input type="file" id="eaDocIn" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple hidden />'
        + '<div class="ea-foot"><small>Your name is never shown to the other people on this case.</small>'
        + '<button class="ea-btn" type="button" id="eaGo">' + (read().loggedIn ? 'Add my name&nbsp; →' : 'Add my name&nbsp; →') + '</button></div>');

      const list = card.querySelector('#eaFiles');
      const size = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
      function render() {
        list.innerHTML = files.map((f, i) => '<li><b>' + esc(f.name) + '</b><span>' + size(f.size) + '</span><button type="button" data-i="' + i + '" aria-label="Remove">×</button></li>').join('');
      }
      list.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        files.splice(+b.dataset.i, 1); render();
      });
      [['#eaPhoto', '#eaPhotoIn'], ['#eaDoc', '#eaDocIn']].forEach(([btn, inp]) => {
        card.querySelector(btn).addEventListener('click', () => card.querySelector(inp).click());
        card.querySelector(inp).addEventListener('change', (e) => { [...e.target.files].forEach((f) => files.push(f)); render(); });
      });

      card.querySelector('#eaGo').addEventListener('click', () => {
        answers[0] = card.querySelector('#eaAns').value.trim();
        if (read().loggedIn) commit();
        else login(commit, 'One step left. Verify your number so your name is counted once.');
      });
    }

`;

/* replace the three screens with the one */
lines.splice(askStart, sigComment - askStart, ...ONE.split('\n'));

/* the questions array is now just the label source; keep asks, drop the generic first question */
const qAt = at('const questions = [');
lines[qAt] = '    /* Kept only so a joined entry still records what the person typed. */';

/* the entry point */
const cAt = at('askStep(0);');
lines[cAt] = lines[cAt].replace('askStep(0);', 'oneStep();');

fs.writeFileSync(F, lines.join('\n'));
console.log('session.js — join is one screen');
console.log('  removed: askStep, evidenceStep, reviewStep (3 required questions + an evidence gate)');
console.log('  added:   oneStep (one optional line, optional files, one button)');
