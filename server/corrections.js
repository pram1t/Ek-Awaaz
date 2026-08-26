/* Deterministic corrections applied after the model has classified.

   These exist for a specific, narrow reason: a handful of cases where the model is reliably
   wrong AND the routing consequence is serious. Telling it in the prompt did not hold — street
   lighting on a national highway kept landing on infra.power even after an explicit rule — and
   a prompt is a request, not a guarantee.

   The bar for adding one is high. It must be a case where:
     - the model gets it wrong repeatedly, and
     - the wrong answer sends the citizen to an office that legally cannot act.

   Everything else is left to the model. Over-correcting here would make her rigid, which is the
   other way this product fails. */

const CORRECTIONS = [
  {
    when: 'infra.power',
    /* Lighting, footpaths, dividers and culverts ON a road belong to that road's authority.
       Our own seed case EA-2026-05230 routes NH-44 lighting to the NHAI Project Director; a
       DISCOM cannot touch a light the highway authority owns. */
    /* No trailing \b: it fails on "street lights" (the s) and on "NH-44" (digit meets digit),
       which is exactly the phrasing this rule exists to catch. */
    test: (t) => /\b(street ?lights?|streetlights?|highways?|nh[-\s]?\d|national highway|expressway|flyover|divider|footpath)/i.test(t)
              || /(स्ट्रीट ?लाइट|हाईवे|राजमार्ग|एक्सप्रेसवे|फ्लाईओवर|डिवाइडर|सड़क की रोशनी)/.test(t),
    to: 'infra.road',
    because: 'lighting on a road belongs to the road authority, not the distribution company'
  }
];

/**
 * @returns {{domain: string, corrected: boolean, because?: string}}
 */
export function correctDomain(text, domain) {
  const t = String(text || '');
  for (const rule of CORRECTIONS) {
    if (domain === rule.when && rule.test(t)) {
      return { domain: rule.to, corrected: true, because: rule.because };
    }
  }
  return { domain, corrected: false };
}

export default correctDomain;
