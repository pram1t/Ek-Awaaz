/* The intake's follow-up questions must never come back in a language the citizen did not use.
 *
 * This was a prompt instruction only — INTAKE_SYSTEM opens with "RULE ONE, above everything:
 * reply in the SAME language and the SAME SCRIPT the person wrote in", and the model broke it in
 * front of me: an English grievance about a burnt-out transformer came back with
 * "Kaun si galiyan sabse zyada prabhavit hain?".
 *
 * nextQuestion() had switchedLanguage() backing it in code; the intake path never did. This suite
 * covers the code guarantee, not the request: the detector, and the substitution that replaces a
 * switched ask with the hand-written English one for that domain.
 *
 * Run:  node scripts/try-intake-language.mjs
 */

import { switchedLanguage } from '../server/ai.js';
import { createRequire } from 'node:module';
const routing = createRequire(import.meta.url)('../data/routing.json');

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log('  ok    ' + name + (detail ? '   ' + detail : '')); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '   ' + detail : '')); }
};

console.log('\nthe detector');

ok(switchedLanguage('Our transformer burnt out and eleven streets have no power',
                    'Kaun si galiyan sabse zyada prabhavit hain?') === true,
   'romanised Hindi after English is caught', '(Latin script, so an alphabet test cannot see it)');

ok(switchedLanguage('The road has potholes', 'कौन सी सड़क सबसे खराब है?') === true,
   'Devanagari after English is caught');

ok(switchedLanguage('The road has potholes', 'Which stretch is worst near you?') === false,
   'English after English is left alone');

ok(switchedLanguage('mera PF claim atka hua hai chaar mahine se', 'Aapne kab claim kiya tha?') === false,
   'romanised Hindi after romanised Hindi is left alone');

ok(switchedLanguage('हमारी सड़क टूटी हुई है', 'यह कब से ऐसी है?') === false,
   'Devanagari after Devanagari is left alone');

console.log('\nthe substitution — what the citizen actually receives');

/* Mirrors the guard in ai.js: a switched ask is replaced by the domain's hand-written question. */
function guard(text, domain, asks) {
  const canned = routing.domains[domain]?.asks || [];
  let forced = false;
  const out = asks.map((a, i) => {
    if (!a || !a.q || !switchedLanguage(text, a.q)) return a;
    forced = true;
    const sub = canned[i] || canned[0];
    return sub ? { ...sub } : a;
  });
  return { asks: out, forced };
}

{
  const text = 'Our transformer burnt out and eleven streets have had no power for nine days';
  const modelSaid = [
    { q: 'Kaun si galiyan sabse zyada prabhavit hain?', hint: 'Yeh jaanne se hum behtar madad kar sakte hain.' },
    { q: 'How many hours a day is the supply out?', hint: 'Give the worst stretch this week.' },
  ];
  const { asks, forced } = guard(text, 'infra.power', modelSaid);

  ok(forced === true, 'a switched ask is detected and forced');
  ok(!switchedLanguage(text, asks[0].q), 'the replacement is in the citizen’s language', '"' + asks[0].q + '"');
  ok(asks[0].q !== modelSaid[0].q, 'the offending question is gone, not patched');
  ok(asks[1].q === modelSaid[1].q, 'the ask that was already fine is untouched');
  ok(asks.length === modelSaid.length, 'the citizen is not left with fewer questions');
  ok(asks.every((a) => a && a.q && a.q.trim().length > 6), 'no ask is emptied by the substitution');
}

{
  /* A domain whose canned asks exist must supply a real replacement, for every domain — otherwise
     the guard silently degrades to leaving the Hindi in place. */
  const missing = Object.entries(routing.domains)
    .filter(([, d]) => !Array.isArray(d.asks) || !d.asks.length || !d.asks[0].q)
    .map(([k]) => k);
  ok(missing.length === 0, 'every domain has a hand-written ask to fall back to',
     missing.length ? 'missing: ' + missing.join(', ') : Object.keys(routing.domains).length + ' domains');
}

{
  /* The whole point is that this is not a prompt. If the guard ever moves back into the prompt,
     this fails. */
  const src = await import('node:fs').then((fs) => fs.readFileSync('server/ai.js', 'utf8'));
  const guardCount = (src.match(/switchedLanguage\(/g) || []).length;
  ok(guardCount >= 3, 'switchedLanguage is called in code on more than one path',
     guardCount + ' call sites (definition + intake + nextQuestion)');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
