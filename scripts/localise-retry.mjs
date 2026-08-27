/* Ask twice before giving up on a language.
 *
 * The script check caught the model returning Gujarati for Kannada and something wrong for Telugu,
 * and correctly refused to show it. But refusing means the citizen gets English — which is the
 * safe answer, not the right one. The same pattern that fixed the banned-ask filter applies here:
 * a rejected attempt is worth one correction and one retry before falling back.
 *
 * The correction names the script explicitly. "Translate into kn-IN" is a locale code; "write this
 * in the Kannada script, ಕನ್ನಡ" is an instruction with an example in it.
 */

import fs from 'node:fs';

const F = 'server/ai.js';
let src = fs.readFileSync(F, 'utf8');

if (src.includes('SCRIPT_NAME')) { console.log('= already applied'); process.exit(0); }

let lines = src.split('\n');
const at = (needle, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && l.includes(needle));
  if (i < 0) throw new Error('not found: ' + needle);
  return i;
};

/* ── the script names, with a sample so the instruction carries its own example ── */
{
  const i = at('const SCRIPT_RANGE = {');
  lines.splice(i, 0,
    '/* Named, with a sample of the script itself. A locale code is not an instruction a model can',
    '   check itself against; a script name plus an example is. */',
    'const SCRIPT_NAME = {',
    "  hi: 'Devanagari (देवनागरी)', mr: 'Devanagari (देवनागरी)',",
    "  bn: 'Bengali (বাংলা)',",
    "  pa: 'Gurmukhi (ਗੁਰਮੁਖੀ)',",
    "  gu: 'Gujarati (ગુજરાતી)',",
    "  od: 'Odia (ଓଡ଼ିଆ)', or: 'Odia (ଓଡ଼ିଆ)',",
    "  ta: 'Tamil (தமிழ்)',",
    "  te: 'Telugu (తెలుగు)',",
    "  kn: 'Kannada (ಕನ್ನಡ)',",
    "  ml: 'Malayalam (മലയാളം)',",
    '};',
    '');
}

/* ── two attempts, with a correction between them ──────────────────────────── */
{
  /* Scoped to localise(). Searching from the top of the file found the try inside classify()
     and spliced that instead, which is how this script broke the file the first time. */
  const fnStart = at('export async function localise');
  const a = at('  try {', fnStart);
  const b = at("    return { lines: list, source: 'fallback', why: err.message };", a);
  const end = at('  }', b);       /* the catch's closing brace */

  lines.splice(a, end - a + 1,
    '  /* Keyed, not positional. Kannada came back with the two lines in the opposite order once, and',
    '     a positional read would have put the location text under the attachment question — a silent',
    '     mismatch that reads as the model being stupid rather than us being careless. */',
    '  const numbered = {};',
    "  list.forEach((line, i) => { numbered[String(i + 1)] = line; });",
    '',
    "  const scriptName = SCRIPT_NAME[String(lang || '').slice(0, 2).toLowerCase()];",
    "  let correction = '';",
    '',
    '  for (let attempt = 0; attempt < 2; attempt++) {',
    '    try {',
    '      const out = await ask(system + correction, JSON.stringify({ lines: numbered }),',
    '                            { maxTokens: 500, temperature: attempt ? 0 : 0.1 });',
    '      const got = out && out.lines;',
    "      const lines2 = list.map((_, i) => String((got && got[String(i + 1)]) || '').trim());",
    '',
    '      if (lines2.some((l) => !l)) {',
    "        correction = '\\nYour previous reply dropped a line. Return every key you were given.\\n';",
    '        continue;',
    '      }',
    '',
    '      /* Asked for Kannada, given Gujarati. Unreadable for the person it is meant for, and the',
    '         voice for that language cannot speak it either. One correction, then English. */',
    '      if (lines2.some((l) => !inExpectedScript(l, lang))) {',
    "        correction = scriptName",
    "          ? '\\nYour previous reply was NOT in the right script. Write every line in the '",
    "            + scriptName + ' script. Nothing in Latin letters, and nothing in any other Indian script.\\n'",
    "          : '\\nYour previous reply was not in the requested script. Use the script of ' + lang + '.\\n';",
    '        continue;',
    '      }',
    '',
    '      cacheSet(key, lines2);',
    "      return { lines: lines2, source: 'model', attempts: attempt + 1 };",
    '    } catch (err) {',
    '      /* Silently English. One English question inside an Odia conversation is a blemish; a',
    '         failed screen is a lost grievance. */',
    "      return { lines: list, source: 'fallback', why: err.message };",
    '    }',
    '  }',
    '',
    "  return { lines: list, source: 'fallback', why: 'wrong_script_twice' };",
    '}');
}

fs.writeFileSync(F, lines.join('\n'));
console.log('server/ai.js — localise() corrects itself once before falling back to English');
