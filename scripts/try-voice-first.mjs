/* Voice-first: she must speak, in the citizen's language, and only when asked to.
 *
 * Two bugs this exists to keep out, both of which happened while building it:
 *
 *  1. The model reported hi-IN for a grievance written in plain English, so the wrong voice was
 *     requested. Language is now derived from the script of what the citizen actually wrote, not
 *     from the model's claim about it.
 *
 *  2. One turn was spoken twice — ask() read the question, then the rendered bubble read the
 *     question plus its hint over the top, cutting the first off. Two code paths reaching the same
 *     sentence.
 *
 * Run against a live server:  BASE=http://localhost:3000 node scripts/try-voice-first.mjs
 */

const BASE = process.env.BASE || 'http://localhost:3000';

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log('  ok    ' + name + (detail ? '   ' + detail : '')); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '   ' + detail : '')); }
};

/* The per-minute rate limit is a real guard on a real budget, and this suite legitimately makes
   about twenty speech calls. Backing off here is correct; raising the product's limit so the tests
   pass would be testing a different application. It has already misread as a regression three
   times, so the wait is explicit and announced. */
async function send(path, body, headers) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(BASE + path, { method: 'POST', headers, body });
    if (res.status !== 429) return res;
    const wait = await res.json().catch(() => ({}));
    const secs = Math.min(65, Number(wait.retryAfter) || 20) + 1;
    process.stdout.write('  · rate limited, waiting ' + secs + 's\n');
    await new Promise((r) => setTimeout(r, secs * 1000));
  }
  throw new Error('still rate limited after six attempts');
}

/* Posted as raw UTF-8 bytes. Passing Devanagari through a shell argument mangles it on Windows,
   which cost real time and twice looked like a code bug that was not there. */
async function intake(text) {
  const res = await send('/api/intake',
    Buffer.from(JSON.stringify({ text }), 'utf8'),
    { 'Content-Type': 'application/json; charset=utf-8' });
  return res.json();
}

async function tts(text, lang) {
  const res = await send('/api/tts',
    Buffer.from(JSON.stringify({ text, lang }), 'utf8'),
    { 'Content-Type': 'application/json; charset=utf-8' });
  if (!res.ok) {
    const why = await res.json().catch(() => ({}));
    return { error: why.error || res.status };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    bytes: buf.length,
    lang: res.headers.get('X-Speech-Lang'),
    cached: res.headers.get('X-Speech-Cached') === 'true',
    type: res.headers.get('Content-Type'),
    /* an MP3 frame begins FF Ex/Fx — proof it is audio and not an error page with a 200 */
    isMp3: buf.length > 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
  };
}

console.log('\nthe language she answers in comes from the script, not the model');

{
  const cases = [
    ['plain English', 'The road to our village has big potholes and nobody has repaired it', 'en-IN'],
    ['Devanagari', 'हमारी सड़क में बड़े गड्ढे हैं और जून से कोई मरम्मत नहीं हुई', 'hi-IN'],
    ['romanised Hindi', 'hamari sadak toot gayi hai aur koi marammat nahi karta', 'hi-IN'],
  ];
  for (const [name, text, want] of cases) {
    const out = await intake(text);
    ok(out.language === want, name + ' → ' + want,
       'got ' + out.language + (out.languageClaimed ? ' (model claimed ' + out.languageClaimed + ')' : ''));
  }
}

console.log('\nshe actually produces audio');

{
  const en = await tts('Your grievance has been recorded.', 'en-IN');
  ok(!en.error && en.isMp3, 'English returns a real MP3', en.error ? String(en.error) : en.bytes + ' bytes');
  ok(en.type === 'audio/mpeg', 'served as audio/mpeg', String(en.type));

  const hi = await tts('आपकी शिकायत दर्ज हो गई है।', 'hi-IN');
  ok(!hi.error && hi.isMp3, 'Devanagari returns a real MP3', hi.error ? String(hi.error) : hi.bytes + ' bytes');
  ok(hi.lang === 'hi-IN', 'and is spoken as hi-IN, not silently downgraded', String(hi.lang));

  const ta = await tts('உங்கள் புகார் பதிவு செய்யப்பட்டது.', 'ta-IN');
  ok(!ta.error && ta.isMp3, 'Tamil returns a real MP3', ta.error ? String(ta.error) : ta.bytes + ' bytes');

  /* Smiti says the same forty-odd lines to everyone. If the cache misses, the cost claim breaks. */
  const again = await tts('Your grievance has been recorded.', 'en-IN');
  ok(again.cached === true, 'a repeated line is served from cache', 'cached=' + again.cached);

  /* Romanised Hindi sent as hi-IN is refused by Bulbul, so it must be routed to en-IN rather
     than failing. This is the looksLatin rule in speech.js. */
  const roman = await tts('Aapki shikayat darj ho gayi hai.', 'hi-IN');
  ok(!roman.error && roman.isMp3, 'romanised text does not fail', roman.error ? String(roman.error) : roman.bytes + ' bytes');
  ok(roman.lang === 'en-IN', 'it is rerouted to en-IN instead of erroring', String(roman.lang));
}

console.log('\nevery language we support can actually be spoken');

{
  /* Eleven locales are claimed. If one cannot produce audio the claim is a lie, so each is asked
     for a real sentence in its own script and checked for an actual MP3 frame header. */
  const SAY = {
    'en-IN': 'Your grievance has been recorded.',
    'hi-IN': 'आपकी शिकायत दर्ज हो गई है।',
    'bn-IN': 'আপনার অভিযোগ নথিভুক্ত হয়েছে।',
    'mr-IN': 'तुमची तक्रार नोंदवली आहे.',
    'ta-IN': 'உங்கள் புகார் பதிவு செய்யப்பட்டது.',
    'te-IN': 'మీ ఫిర్యాదు నమోదు చేయబడింది.',
    'kn-IN': 'ನಿಮ್ಮ ದೂರು ದಾಖಲಾಗಿದೆ.',
    'ml-IN': 'നിങ്ങളുടെ പരാതി രേഖപ്പെടുത്തി.',
    'gu-IN': 'તમારી ફરિયાદ નોંધાઈ ગઈ છે.',
    'pa-IN': 'ਤੁਹਾਡੀ ਸ਼ਿਕਾਇਤ ਦਰਜ ਹੋ ਗਈ ਹੈ।',
    'od-IN': 'ଆପଣଙ୍କ ଅଭିଯୋଗ ଦାଖଲ ହୋଇଛି।',
  };
  const failed = [];
  for (const [lang, text] of Object.entries(SAY)) {
    const out = await tts(text, lang);
    if (out.error || !out.isMp3 || out.lang !== lang) {
      failed.push(lang + (out.error ? ' (' + out.error + ')' : ''));
    }
  }
  ok(failed.length === 0, 'all 11 locales return audio in their own language',
     failed.length ? 'failing: ' + failed.join(', ') : '11/11');

  const voiceSrc = await fetch(BASE + '/voice.js').then((r) => r.text());
  ok(!/createElement('select')/.test(voiceSrc) && !/const LANGS/.test(voiceSrc),
     'there is no language picker at all', 'the language is detected from the audio');
  ok(/EAAPI\.listen\(blob/.test(voiceSrc), 'Saaras transcribes when the browser cannot',
     'most Indic languages have no browser recogniser at all');
  ok(/EAAPI\.listen\(blob\)/.test(voiceSrc) && !/EAAPI\.listen\(blob,/.test(voiceSrc),
     'the audio is sent with no language hint', 'Sarvam detects it and reports what it heard');
  ok(!/rec = new SR\(\)/.test(voiceSrc),
     'the browser recogniser no longer produces answers',
     'it returned "I’m going to organ body control" for an Odia sentence');
}

console.log('\nthe turn ends when the speaking does');

{
  const v = await fetch(BASE + '/voice.js').then((r) => r.text());

  ok(/const SILENCE_MS = \d+/.test(v), 'silence ends the turn', (v.match(/SILENCE_MS = (\d+)/) || [])[1] + 'ms');
  ok(/if \(!heardSpeech\) return;/.test(v), 'quiet only counts once something was said',
     'otherwise a quiet room submits an empty turn');
  ok(/setInterval\(watch, \d+\)/.test(v), 'silence is watched on a timer, not the animation frame',
     'rAF stops in a hidden tab, which would strand the turn until the cap');

  /* The meter is visual and belongs on rAF; the decision is not visual and must not.
     Bounded to loop() itself — slicing to the next named function swept in start(), stop() and
     watch(), and reported logic that was correctly placed as if it were not. */
  const loopStart = v.indexOf('function loop()');
  /* loop() ends at its own rAF re-entry. Bounding on the next "function " missed, because the next
     one is `async function start()` — so the slice swept in start() and stop() and the assertion
     failed on logic that was correctly placed. */
  const loopEnd = v.indexOf('requestAnimationFrame(loop);', loopStart);
  const loopBody = v.slice(loopStart, loopEnd > loopStart ? loopEnd : loopStart + 900);
  ok(!/commitLive|heardSpeech|quietSince/.test(loopBody),
     'the frame loop only paints bars', 'no decision logic left inside it');

  ok(/MAX_TURN_MS = \d+/.test(v), 'a turn cannot run forever',
     (v.match(/MAX_TURN_MS = (\d+)/) || [])[1] + 'ms cap');
  ok(!/ea-voice-use/.test(v), 'there is no send button at all',
     'silence ends the turn; a button for it was one gesture too many');

  const page = await fetch(BASE + '/report').then((r) => r.text());
  ok(!/class="legal"/.test(page), 'the composer footnote is gone');
  ok(/}, 300\);/.test(page), 'sending is not delayed now the mic decides the turn', '300ms');
}

console.log('\nspeech survives one provider failing');

{
  const health = await fetch(BASE + '/api/health').then((r) => r.json());
  const sp = health.speech || {};
  ok(!!sp.fallback, 'a second provider is reported at all');
  ok(sp.fallback && typeof sp.fallback.configured === 'boolean',
     'and says whether it is configured', 'configured=' + (sp.fallback && sp.fallback.configured));
  ok(sp.fallback && sp.fallback.ceilingUsd > 0,
     'metered against its own ceiling',
     'so a voice session cannot eat the intake budget · $' + (sp.fallback && sp.fallback.ceilingUsd));
  ok(sp.provider !== undefined, 'the primary provider is named', String(sp.provider));
}

console.log('\nthe page does not talk unless spoken to');

{
  const html = await fetch(BASE + '/report').then((r) => r.text());
  ok(/let voiceMode = false/.test(html), 'voice replies start off');
  ok(/if \(\/class=.aside.\/\.test\(inner\)\) return turn;/.test(html),
     'a hinted turn is not spoken twice', 'the ask()/bubble() double-read guard is present');
  ok(/voiceReplies/.test(html), 'there is a visible control to silence her');
  ok(/sayAloud\(/.test(html), 'turns are wired to speech');
  const client = await fetch(BASE + '/api-client.js').then((r) => r.text());
  ok(/speak: async/.test(client) && /listen: async/.test(client),
     'the client can both speak and listen');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
