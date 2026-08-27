/* Attach data-i18n to the strings that actually appear on screen.

   The engine was built and then nothing was marked up, so switching language changed the
   selector button and nothing else. This walks the three pages and tags the visible text by
   exact match, adding keys to i18n.js where they did not exist.

   Deliberately literal: it matches whole strings rather than guessing, and reports anything it
   could not find so the gap is visible instead of silent. */

import fs from 'node:fs';

/* key -> the exact English text currently in the HTML */
const MAP = {
  'public/index.html': {
    'hero.cta': ['Tell us what happened'],
    'didi.eyebrow': ['Talk to Smiti Didi'],
    'didi.title': ['Tell me what went wrong.', 'Tell me what happened.'],
    'didi.lede': ['Smiti asks one question at a time, in your language. She never asks you to name a department, and nothing is filed until you have read it back.',
                  'Didi asks one question at a time, in your language. She never asks you to name a department, and nothing is filed until you have read it back.'],
    'didi.examples': ['Not sure how to start? Tap one of these.'],
    'didi.start': ['Start with Didi', 'Start with Smiti'],
    'didi.speak': ['Speak instead, in any of 22 languages', 'Speak instead, in your own language'],
    'join.add': ['Add my support'],
    'join.privacy': ['Your name is never shown to other signatories.'],
    'nav.cases': ['My grievances']
  },
  'public/report.html': {
    'report.answerHere': ['Type your answer, or press the mic to speak'],
    'route.send': ['Confirm and send →', 'Confirm and send'],
    'otp.phone': ['10-digit mobile number'],
    'otp.send': ['Send code →', 'Send code'],
    'otp.verify': ['Verify and send →', 'Verify and send'],
    'common.back': ['← Back', 'Back']
  },
  'public/my-cases.html': {
    'cases.title': ['My grievances', 'My cases'],
    'nav.new': ['New grievance']
  }
};

/* keys the pages need that i18n.js does not carry yet */
const EXTRA = {
  en: {
    'nav.new': 'New report',
    'didi.thread1': 'Tell me what happened, or ask me what you are owed.',
    'didi.thread2': 'I will find who owns the problem, what clock that office is on, and what you can do if they miss it. You see all of it before anything is sent.'
  },
  hi: {
    'nav.new': 'नई शिकायत',
    'didi.thread1': 'बताइए क्या हुआ, या पूछिए कि आपका हक़ क्या है।',
    'didi.thread2': 'मैं पता लगाऊँगी कि यह किसका काम है, उस दफ़्तर पर कितने दिन का समय है, और अगर वे चूक जाएँ तो आप क्या कर सकते हैं। भेजने से पहले आपको सब दिख जाएगा।'
  }
};

/* ---------- 1. add the extra keys to i18n.js ---------- */

const iFile = 'public/i18n.js';
let i18n = fs.readFileSync(iFile, 'utf8');
const eol = i18n.includes('\r\n') ? '\r\n' : '\n';

for (const lang of ['en', 'hi']) {
  for (const [key, val] of Object.entries(EXTRA[lang])) {
    if (i18n.includes(`'${key}'`)) continue;
    const anchor = lang === 'en' ? "      'nav.how':" : "      'nav.how':";
    const idx = lang === 'en' ? i18n.indexOf(anchor) : i18n.lastIndexOf(anchor);
    if (idx < 0) { console.log('  ! anchor missing for', lang); continue; }
    i18n = i18n.slice(0, idx) + `      '${key}': ${JSON.stringify(val)},` + eol + i18n.slice(idx);
  }
}
fs.writeFileSync(iFile, i18n);
console.log('i18n.js — extra keys added');

/* ---------- 2. tag the HTML ---------- */

let tagged = 0;
const missed = [];

for (const [file, keys] of Object.entries(MAP)) {
  let html = fs.readFileSync(file, 'utf8');

  for (const [key, variants] of Object.entries(keys)) {
    let done = false;
    for (const text of variants) {
      const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      /* an element whose entire text is this string */
      const asText = new RegExp('(<(h1|h2|h3|p|b|span|small|button|a|label)\\b([^>]*)>)(\\s*)' + esc + '(\\s*)(</\\2>)');
      if (asText.test(html) && !new RegExp('data-i18n="' + key + '"').test(html)) {
        html = html.replace(asText, (m, open, tag, attrs, s1, s2, close) =>
          `<${tag}${attrs} data-i18n="${key}">${s1}${text}${s2}${close}`);
        tagged += 1; done = true; break;
      }

      /* a placeholder */
      const asPh = new RegExp('placeholder="' + esc + '"');
      if (asPh.test(html)) {
        html = html.replace(asPh, `placeholder="${text}" data-i18n-ph="${key}"`);
        tagged += 1; done = true; break;
      }
    }
    if (!done) missed.push(`${file}  ${key}`);
  }

  fs.writeFileSync(file, html);
}

console.log(`tagged ${tagged} strings`);
if (missed.length) {
  console.log('\nnot found — these still need doing by hand:');
  for (const m of missed) console.log('  ' + m);
}
