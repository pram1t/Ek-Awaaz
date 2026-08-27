/* Ek Awaaz — illustrated panels for the concern cards.
 *
 * The card shape that worked: a pale panel carrying the subject, a white body carrying the
 * words, and a scalloped kolam edge where the two meet. What it carries is a flat drawing of
 * the thing people actually report — a road with potholes, a handpump, a transformer — in
 * four colours and no gradients.
 *
 * Injected rather than written into the markup, for two reasons. The routing knowledge
 * already in those cards (which office, which clock, which remedy) is the substance of the
 * product and must not be disturbed to add decoration. And nine inline SVGs in the HTML would
 * be nine blocks of geometry sitting in the middle of the page's content.
 *
 * Matched on the card's own heading, so the drawing follows the subject even if the cards are
 * reordered, and a subject with no drawing simply gets the plain panel rather than a gap.
 *
 * Weight: the whole set is a few KB of paths. No image requests at all, which matters because
 * the product's claim is that it works on the connection most of the country actually has.
 */

(function () {
  'use strict';

  /* four colours, and the ground the drawing sits on */
  const G = {
    sky: '#cfdfca',        /* pale field behind everything */
    grass: '#3f6b47',      /* mid green */
    grassDk: '#2c5136',    /* shadow green */
    terra: '#c98a68',      /* terracotta */
    terraDk: '#a8613f',    /* terracotta shadow */
    roof: '#4a3b36',       /* dark brown, for roofs and metal */
    cream: '#f6efe3'       /* highlight */
  };

  /* Each drawing is a viewBox of 320x210 so they crop identically in the panel. */
  const ART = {

    road:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 74 Q160 56 320 74 V210 H0 Z" fill="${G.grass}"/>
       <path d="M0 132 Q160 112 320 132 V210 H0 Z" fill="${G.grassDk}"/>
       <path d="M126 74 Q136 140 78 210 H242 Q196 140 194 74 Z" fill="${G.terra}"/>
       <path d="M126 74 Q136 140 78 210 H108 Q152 140 148 74 Z" fill="#d9a184"/>
       <ellipse cx="150" cy="128" rx="15" ry="6" fill="#7d4429"/>
       <ellipse cx="128" cy="164" rx="22" ry="9" fill="#7d4429"/>
       <ellipse cx="166" cy="196" rx="28" ry="11" fill="#7d4429"/>
       <g fill="${G.grassDk}"><ellipse cx="40" cy="150" rx="30" ry="13"/><ellipse cx="286" cy="168" rx="26" ry="11"/></g>
       <g stroke="${G.grassDk}" stroke-width="3" stroke-linecap="round" opacity=".6">
         <path d="M62 116 q3-11 7-15"/><path d="M250 122 q3-11 7-15"/><path d="M282 104 q3-9 6-12"/></g>`,

    power:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 128 Q160 108 320 128 V210 H0 Z" fill="${G.grass}"/>
       <rect x="152" y="34" width="12" height="112" fill="${G.roof}"/>
       <rect x="112" y="54" width="92" height="8" fill="${G.roof}"/>
       <rect x="122" y="76" width="72" height="7" fill="${G.roof}"/>
       <rect x="176" y="92" width="38" height="34" rx="4" fill="${G.terra}"/>
       <rect x="183" y="99" width="24" height="6" fill="${G.cream}"/>
       <rect x="183" y="110" width="24" height="6" fill="${G.cream}"/>
       <path d="M112 58 Q60 74 0 62" stroke="${G.roof}" stroke-width="3" fill="none"/>
       <path d="M204 58 Q262 78 320 66" stroke="${G.roof}" stroke-width="3" fill="none"/>
       <g fill="${G.grassDk}"><ellipse cx="52" cy="160" rx="32" ry="14"/><ellipse cx="272" cy="172" rx="26" ry="11"/></g>`,

    water:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 122 Q160 102 320 122 V210 H0 Z" fill="${G.grass}"/>
       <rect x="96" y="146" width="128" height="14" rx="3" fill="${G.terra}"/>
       <rect x="106" y="136" width="108" height="11" rx="2" fill="#d9a184"/>
       <rect x="153" y="58" width="13" height="80" fill="${G.roof}"/>
       <path d="M122 66 h44 v11 h-44 a5.5 5.5 0 0 1 0-11Z" fill="${G.roof}"/>
       <path d="M166 84 h30 l-8 14 h-22 Z" fill="${G.roof}"/>
       <g fill="${G.grassDk}"><ellipse cx="190" cy="126" rx="4" ry="7"/><ellipse cx="199" cy="140" rx="3" ry="6"/></g>
       <g fill="${G.grassDk}"><ellipse cx="42" cy="158" rx="28" ry="12"/><ellipse cx="284" cy="170" rx="24" ry="10"/></g>`,

    bank:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 132 Q160 114 320 132 V210 H0 Z" fill="${G.grass}"/>
       <path d="M74 76 L160 34 L246 76 Z" fill="${G.roof}"/>
       <rect x="86" y="78" width="148" height="66" fill="${G.terra}"/>
       <g fill="${G.terraDk}">
         <rect x="102" y="92" width="14" height="52"/><rect x="128" y="92" width="14" height="52"/>
         <rect x="178" y="92" width="14" height="52"/><rect x="204" y="92" width="14" height="52"/></g>
       <rect x="150" y="104" width="20" height="40" fill="${G.roof}"/>
       <rect x="74" y="144" width="172" height="9" fill="${G.cream}"/>
       <circle cx="160" cy="24" r="7" fill="${G.terra}"/>
       <g fill="${G.grassDk}"><ellipse cx="38" cy="166" rx="26" ry="11"/><ellipse cx="286" cy="176" rx="24" ry="10"/></g>`,

    ration:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 130 Q160 112 320 130 V210 H0 Z" fill="${G.grass}"/>
       <path d="M78 72 Q160 34 242 72 Z" fill="${G.roof}"/>
       <rect x="88" y="74" width="144" height="72" fill="${G.terra}"/>
       <rect x="106" y="98" width="48" height="48" fill="${G.terraDk}"/>
       <rect x="172" y="98" width="36" height="28" fill="${G.cream}"/>
       <rect x="78" y="146" width="164" height="9" fill="${G.cream}"/>
       <g fill="#d9a184"><ellipse cx="256" cy="140" rx="17" ry="19"/><ellipse cx="276" cy="146" rx="14" ry="15"/></g>
       <g fill="${G.grassDk}"><ellipse cx="40" cy="168" rx="26" ry="11"/></g>`,

    /* a form with an endorsement stamp: what a claim actually is */
    claim:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 138 Q160 120 320 138 V210 H0 Z" fill="${G.grass}"/>
       <rect x="98" y="34" width="124" height="150" rx="3" fill="${G.cream}"/>
       <g fill="${G.terra}"><rect x="114" y="56" width="76" height="7"/><rect x="114" y="74" width="92" height="7"/>
         <rect x="114" y="92" width="64" height="7"/><rect x="114" y="110" width="84" height="7"/></g>
       <circle cx="188" cy="146" r="24" fill="none" stroke="${G.terraDk}" stroke-width="4"/>
       <circle cx="188" cy="146" r="15" fill="none" stroke="${G.terraDk}" stroke-width="2.4"/>
       <path d="M178 146 l7 7 12-14" stroke="${G.terraDk}" stroke-width="4" fill="none" stroke-linecap="round"/>`,

    /* an umbrella over a small house: cover, and what it is for */
    insurance:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 140 Q160 122 320 140 V210 H0 Z" fill="${G.grass}"/>
       <path d="M62 96 a98 98 0 0 1 196 0 Z" fill="${G.terra}"/>
       <path d="M62 96 a98 98 0 0 1 49 0 a49 49 0 0 1 49 0 a49 49 0 0 1 49 0 a98 98 0 0 1 49 0" fill="${G.terraDk}" opacity=".45"/>
       <rect x="156" y="96" width="8" height="62" fill="${G.roof}"/>
       <path d="M164 158 a12 12 0 0 0 22 0" stroke="${G.roof}" stroke-width="7" fill="none" stroke-linecap="round"/>
       <path d="M104 176 L138 152 L172 176 Z" fill="${G.cream}"/>
       <rect x="114" y="176" width="48" height="20" fill="${G.cream}"/>`,

    /* a hand receiving a coin: a pension is money that arrives, or does not */
    pension:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 136 Q160 118 320 136 V210 H0 Z" fill="${G.grass}"/>
       <circle cx="160" cy="62" r="26" fill="${G.terra}"/>
       <circle cx="160" cy="62" r="16" fill="none" stroke="${G.cream}" stroke-width="3"/>
       <path d="M152 54 h16 M152 62 h16 M156 54 v16" stroke="${G.cream}" stroke-width="3" fill="none"/>
       <path d="M96 152 q10-34 40-30 l24 4 q28 4 34 26 z" fill="#d9a184"/>
       <path d="M96 152 h130 v14 a10 10 0 0 1 -10 10 h-110 a10 10 0 0 1 -10 -10 z" fill="${G.terra}"/>`,

    /* an identity card */
    id:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 142 Q160 124 320 142 V210 H0 Z" fill="${G.grass}"/>
       <rect x="76" y="52" width="168" height="108" rx="6" fill="${G.cream}"/>
       <rect x="76" y="52" width="168" height="20" rx="6" fill="${G.terraDk}"/>
       <circle cx="118" cy="106" r="20" fill="${G.terra}"/>
       <path d="M100 140 a18 18 0 0 1 36 0 Z" fill="${G.terra}"/>
       <g fill="${G.terra}"><rect x="152" y="92" width="72" height="7"/><rect x="152" y="108" width="58" height="7"/>
         <rect x="152" y="124" width="66" height="7"/></g>`,

    /* a carriage head-on: the thing you were waiting for */
    rail:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 148 Q160 132 320 148 V210 H0 Z" fill="${G.grass}"/>
       <rect x="98" y="40" width="124" height="118" rx="10" fill="${G.terra}"/>
       <rect x="112" y="56" width="96" height="38" rx="5" fill="${G.cream}"/>
       <rect x="128" y="106" width="64" height="30" rx="4" fill="${G.terraDk}"/>
       <circle cx="122" cy="150" r="11" fill="${G.roof}"/>
       <circle cx="198" cy="150" r="11" fill="${G.roof}"/>
       <rect x="70" y="164" width="180" height="7" fill="${G.roof}"/>
       <g fill="${G.roof}"><rect x="86" y="174" width="10" height="24"/>
         <rect x="152" y="174" width="10" height="24"/><rect x="218" y="174" width="10" height="24"/></g>`,

    /* a station and its board: the office that did not act. Deliberately a building and a
       sign rather than a uniform or a lathi — the grievance is inaction, not a person. */
    station:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 140 Q160 122 320 140 V210 H0 Z" fill="${G.grass}"/>
       <rect x="152" y="14" width="7" height="26" fill="${G.roof}"/>
       <path d="M159 16 h36 v15 h-36 Z" fill="${G.terraDk}"/>
       <path d="M70 76 L160 38 L250 76 Z" fill="${G.roof}"/>
       <rect x="84" y="78" width="152" height="74" fill="${G.terra}"/>
       <rect x="140" y="104" width="40" height="48" fill="${G.terraDk}"/>
       <rect x="100" y="98" width="28" height="24" fill="${G.cream}"/>
       <rect x="192" y="98" width="28" height="24" fill="${G.cream}"/>
       <rect x="70" y="152" width="180" height="9" fill="${G.cream}"/>`,

    /* a filing with a clock on it: an answer that never came */
    rti:
      `<rect width="320" height="210" fill="${G.sky}"/>
       <path d="M0 142 Q160 124 320 142 V210 H0 Z" fill="${G.grass}"/>
       <rect x="86" y="32" width="118" height="146" rx="3" fill="${G.cream}"/>
       <g fill="${G.terra}"><rect x="102" y="54" width="70" height="7"/><rect x="102" y="72" width="86" height="7"/>
         <rect x="102" y="90" width="58" height="7"/><rect x="102" y="108" width="76" height="7"/></g>
       <circle cx="208" cy="140" r="30" fill="${G.terraDk}"/>
       <circle cx="208" cy="140" r="22" fill="${G.cream}"/>
       <path d="M208 124 v16 h13" stroke="${G.terraDk}" stroke-width="4" fill="none" stroke-linecap="round"/>`
  };

  /* Which drawing belongs to which card, matched on the heading rather than on position. */
  const MATCH = [
    [/road|pothole|highway/i, 'road'],
    [/electric|power|discom|billing/i, 'power'],
    [/water|sanitat|drain|handpump/i, 'water'],
    [/bank|payment|debit|transaction/i, 'bank'],
    [/ration|pds|grain/i, 'ration'],
    [/pf|provident|employ/i, 'claim'],
    [/insur/i, 'insurance'],
    [/pension/i, 'pension'],
    [/pan|aadhaar|identit|govt id|id\b/i, 'id'],
    [/rail|train|ticket|irctc/i, 'rail'],
    [/police|fir\b|inaction/i, 'station'],
    [/rti|right to information/i, 'rti']
  ];

  function artFor(title) {
    for (const [re, key] of MATCH) if (re.test(title)) return ART[key];
    return null;
  }

  function mount() {
    const cards = document.querySelectorAll('.category-card');
    if (!cards.length) return;

    cards.forEach((card) => {
      if (card.querySelector('.panel')) return;                 /* idempotent */
      const h = card.querySelector('h3');
      const art = artFor(h ? h.textContent : '');
      if (!art) return;

      const panel = document.createElement('div');
      panel.className = 'panel';
      panel.setAttribute('aria-hidden', 'true');                /* the heading already says it */
      panel.innerHTML = '<svg viewBox="0 0 320 210" preserveAspectRatio="xMidYMid slice">' + art + '</svg>';
      card.insertBefore(panel, card.firstChild);
      card.classList.add('has-panel');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  window.EAPanels = { mount, ART };
})();
