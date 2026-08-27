/* Give the report composer the same speak-instead control the homepage has.

   The composer had its own hand-rolled SpeechRecognition: a plain mic button plus a
   "Listening…" strip above the row, with a scripted word-by-word fallback that typed
   "Rajnagar Ward 4 Madhubani district" into the box when the browser had no recogniser.
   That fallback put words the citizen never said into a grievance, which is exactly the
   kind of thing this project argues against. EAVoice replaces all of it: a real mic level
   from an AnalyserNode, real transcription where it exists, and an honest message where
   it does not.

   The panel anchors from the left of its host row, so the mic moves to the head of the
   row and the clip moves next to send. */

import fs from 'node:fs';

const F = 'public/report.html';
let h = fs.readFileSync(F, 'utf8');
const was = h.length;
let n = 0;
const swap = (a, b) => { if (!h.includes(a)) { console.log('  ! miss: ' + a.slice(0, 70)); return; } h = h.replace(a, b); n++; };

/* ---- 1. markup: mic first, clip beside send, no "Listening" strip ---- */

swap('<div class="note" id="note"><span class="wave"><i></i><i></i><i></i><i></i><i></i></span><span id="noteText">Listening. Speak in your own language.</span></div>', '');

const CLIP = '<button class="clip" id="clip" type="button" aria-label="Attach a photo or document"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 11.5l-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.2 3.2 0 0 1 4.6 4.6l-8.6 8.5a1.5 1.5 0 0 1-2.1-2.1l7.9-7.9" /></svg></button>';
const MIC = '<button class="mic" id="mic" type="button" aria-label="Answer by speaking"><em></em><em></em><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></svg></button>';

swap(CLIP, '<div id="voiceMount"></div>');
swap(MIC, CLIP);

/* ---- 2. the host row needs the taller button and room for the clip ---- */

swap('.mic{position:relative;', `.composer .row{--h:52px}
.composer .row .ea-voice-panel{left:calc(var(--h) + 12px)}
.composer .row .ea-voice-btn{background:var(--blue)}
.composer .row .ea-voice-btn:hover{background:#1740b8}
.mic{position:relative;`);

/* ---- 3. script tag ---- */

swap('<script src="session.js?v=20260826-12"></script>',
     '<script src="session.js?v=20260826-12"></script>\n<script src="voice.js?v=20260826-13"></script>');

/* ---- 4. drop the old recogniser wholesale ---- */

const start = h.indexOf('const Recognition = window.SpeechRecognition');
const end = h.indexOf('const photoInput = document.querySelector');
if (start < 0 || end < 0 || end < start) {
  console.log('  ! could not bound the old recogniser block');
} else {
  h = h.slice(0, start) + `/* Speak instead. EAVoice owns the mic, the level meter and the transcript; the answer is
   only written into the box when the citizen presses "Use this". */
const voice = window.EAVoice && EAVoice.attach({
  button: true,
  mount: document.querySelector('#voiceMount'),
  lang: (window.EAI18N && EAI18N.lang() === 'hi') ? 'hi-IN' : 'en-IN',
  onFinal: (said) => {
    reply.value = reply.value ? reply.value.trim() + ' ' + said : said;
    reply.dispatchEvent(new Event('input'));
    reply.focus();
    reply.setSelectionRange(reply.value.length, reply.value.length);
  }
});
document.addEventListener('ea:lang', (e) => {
  if (voice && voice.setLang) voice.setLang(e.detail && e.detail.lang === 'hi' ? 'hi-IN' : 'en-IN');
});

` + h.slice(end);
  n++;
}

/* ---- 5. the two remaining #mic references ---- */

swap("const reply = document.querySelector('#reply'), micBtn = document.querySelector('#mic');",
     "const reply = document.querySelector('#reply');");
swap("const note = document.querySelector('#note'), noteText = document.querySelector('#noteText');", '');
swap("  document.querySelector('#mic').disabled = true;",
     "  const vb = document.querySelector('.ea-voice-btn');\n  if (vb) vb.disabled = true;");

fs.writeFileSync(F, h);
console.log(`report.html  ${n} edits  ${was} -> ${h.length}`);
