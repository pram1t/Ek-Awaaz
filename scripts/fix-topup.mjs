/* Three fixes visible in the last intake run.

   1. TOP-UP WAS WORSE THAN THE GAP. When a banned ask was dropped I refilled from the
      keyword-fallback domain's questions — which are English-only and belong to whichever
      domain the KEYWORDS list guessed, not the one the model chose. A Hindi PF conversation
      got an English question about "the block office, a bank, a school"; the NH-44 case got
      the water question. One good question is better than two mismatched ones, so we now
      top up only from the model's own domain, only in English conversations, and otherwise
      accept a single ask.

   2. optionKey WAS VALIDATED GLOBALLY. Any tier key from any domain passed, so infra.power
      came back carrying tier "national_highway" — a domain that has no tiers at all. It is
      now checked against the chosen domain's own options.

   3. The hand-written examples carry a literal "Example: " prefix, which read oddly when they
      appeared beside model-written ones. Stripped at the point of use. */

import fs from 'node:fs';

const f = 'server/guardrails.js';
let g = fs.readFileSync(f, 'utf8');
const eol = g.includes('\r\n') ? '\r\n' : '\n';

/* ---- 2. scope the tier check to the chosen domain ---- */

const oldOpt = `    if (typeof out.optionKey === 'string' && optionKeys.includes(out.optionKey)) {`;
const newOpt = [
  '    /* Scoped to the domain we actually settled on. Validating against every tier key in the',
  '       table let infra.power come back holding "national_highway", a tier it does not have. */',
  '    const allowedTiers = typeof optionKeys === \'function\' ? optionKeys(safe.domain) : optionKeys;',
  '    if (typeof out.optionKey === \'string\' && allowedTiers.includes(out.optionKey)) {'
].join(eol);
if (!g.includes(oldOpt)) { console.error('optionKey anchor missing'); process.exit(1); }
g = g.replace(oldOpt, newOpt);

/* ---- 1 + 3. sane top-up ---- */

const oldTop = g.slice(g.indexOf('      /* Filtering a banned ask'), g.indexOf('    }', g.indexOf('      /* Filtering a banned ask')));
const newTop = [
  '      /* Only top up where it would actually help: the model\'s own domain, English only,',
  '         because the hand-written questions exist in English alone. Dropping to one good',
  '         question beats appending one in the wrong language about the wrong subject. */',
  '      const english = /^en/i.test(safe.language || \'en\');',
  '      const own = (topUp && topUp(safe.domain)) || [];',
  '      if (english) {',
  '        const spare = own.filter((f) => !asks.some((a) => a.q === f.q));',
  '        while (asks.length < 2 && spare.length) {',
  '          const s = spare.shift();',
  '          asks.push({ q: s.q, hint: s.hint, ph: String(s.ph || \'\').replace(/^Example:\\s*/i, \'\') });',
  '        }',
  '      }',
  '      if (asks.length) safe.asks = asks.slice(0, 3);',
  ''
].join(eol);
g = g.replace(oldTop, newTop);

/* the validator needs the two lookups */
g = g.replace(
  'export function validateClassification(out, { domainKeys, optionKeys, fallback }) {',
  'export function validateClassification(out, { domainKeys, optionKeys, fallback, topUp }) {'
);

/* strip the prefix on the fallback path too */
g = g.replace(
  "ph: clean(a && a.ph, 120) || ((fallback.asks && fallback.asks[i] && fallback.asks[i].ph) || '')",
  "ph: clean(a && a.ph, 120) || String((fallback.asks && fallback.asks[i] && fallback.asks[i].ph) || '').replace(/^Example:\\s*/i, '')"
);

fs.writeFileSync(f, g);
console.log('guardrails.js patched');

/* ---- pass the lookups in from ai.js ---- */

const af = 'server/ai.js';
let a = fs.readFileSync(af, 'utf8');
const aeol = a.includes('\r\n') ? '\r\n' : '\n';

a = a.replace(
  'const safe = validateClassification(raw, { domainKeys: DOMAIN_KEYS, optionKeys: OPTION_KEYS, fallback });',
  [
    'const safe = validateClassification(raw, {',
    '      domainKeys: DOMAIN_KEYS,',
    '      /* tiers belonging to the chosen domain, not every tier in the table */',
    '      optionKeys: (d) => (routing.domains[d]?.disambiguator?.options || []).map((o) => o.key),',
    '      /* the hand-written questions for the chosen domain, for topping up */',
    '      topUp: (d) => routing.domains[d]?.asks || [],',
    '      fallback',
    '    });'
  ].join(aeol + '    ')
);
fs.writeFileSync(af, a);
console.log('ai.js passes domain-scoped lookups:', a.includes('topUp:'));
