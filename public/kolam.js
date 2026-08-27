/* Ek Awaaz — kolam, and the motion that goes with it.
 *
 * Three things live here, all of them the answer to a fair complaint: that recolouring the
 * site left it structurally identical and visually inert.
 *
 *   1. KOLAM   an abstract rangoli generated from a pulli dot grid, drawn on load rather
 *              than dropped in finished. A kolam is a continuous line looped around a grid
 *              of dots, and the drawing of it is the point — so the strokes animate their
 *              own stroke-dashoffset ring by ring, the way a hand would lay it down.
 *              Geometry, never an illustration: it scales, weighs nothing, and cannot look
 *              like clip art.
 *
 *   2. REVEAL  a staggered entrance for anything marked [data-reveal], driven by an
 *              IntersectionObserver so it fires when a section is actually reached instead
 *              of all at once on load.
 *
 *   3. COUNT   numbers that count up to their value once, so a statistic reads as something
 *              measured rather than typeset.
 *
 * Every one of these is off when the visitor asks for reduced motion — checked once here,
 * not left to a media query that only covers the CSS half. The page must be complete and
 * correct with no JavaScript at all: the kolam is decorative and aria-hidden, reveals start
 * from a visible state and are only hidden once we know we can animate them back, and the
 * counters print their final value immediately if motion is refused.
 */

(function () {
  'use strict';

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────────── 1 · KOLAM ─────────────────────────────── */

  const SVG = 'http://www.w3.org/2000/svg';
  const el = (name, attrs) => {
    const n = document.createElementNS(SVG, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  /* A pulli kolam: concentric rings of overlapping circles around a dot grid. Ring i holds
     `petals * i` circles, which is what makes the rosette open outward the way a real one
     does instead of repeating a fixed count. */
  function rangoli(opts) {
    const o = Object.assign({ rings: 4, petals: 8, r0: 46, gap: 44, dots: true }, opts);
    const span = o.r0 + o.rings * o.gap + o.gap;
    const size = span * 2;
    const svg = el('svg', {
      viewBox: `0 0 ${size} ${size}`, class: 'kolam', 'aria-hidden': 'true',
      fill: 'none', stroke: 'currentColor'
    });
    const cx = span, cy = span;
    const groups = [];

    /* the centre rosette */
    const core = el('g', { 'stroke-width': '1.6', class: 'kolam-ring' });
    for (let p = 0; p < o.petals; p++) {
      const a = (p / o.petals) * Math.PI * 2;
      core.appendChild(el('circle', {
        cx: (cx + Math.cos(a) * o.r0 * 0.52).toFixed(2),
        cy: (cy + Math.sin(a) * o.r0 * 0.52).toFixed(2),
        r: (o.r0 * 0.52).toFixed(2)
      }));
    }
    svg.appendChild(core); groups.push(core);

    /* the rings */
    for (let i = 1; i <= o.rings; i++) {
      const g = el('g', { 'stroke-width': i === o.rings ? '1.1' : '1.5', class: 'kolam-ring' });
      const r = o.r0 + i * o.gap;
      const count = o.petals * i;
      for (let p = 0; p < count; p++) {
        const a = (p / count) * Math.PI * 2;
        g.appendChild(el('circle', {
          cx: (cx + Math.cos(a) * r).toFixed(2),
          cy: (cy + Math.sin(a) * r).toFixed(2),
          r: (o.gap * 0.58).toFixed(2)
        }));
      }
      /* the pulli themselves, the dots the line is laid around */
      if (o.dots) {
        for (let p = 0; p < count; p++) {
          const a = ((p + 0.5) / count) * Math.PI * 2;
          g.appendChild(el('circle', {
            cx: (cx + Math.cos(a) * r).toFixed(2),
            cy: (cy + Math.sin(a) * r).toFixed(2),
            r: '2.1', fill: 'currentColor', stroke: 'none'
          }));
        }
      }
      svg.appendChild(g); groups.push(g);
    }

    /* a square kolam frame, the grid the rosette sits on */
    const frame = el('g', { 'stroke-width': '1.2', class: 'kolam-ring' });
    const k = o.r0 + o.rings * o.gap;
    frame.appendChild(el('rect', {
      x: (cx - k).toFixed(2), y: (cy - k).toFixed(2),
      width: (k * 2).toFixed(2), height: (k * 2).toFixed(2),
      transform: `rotate(45 ${cx} ${cy})`
    }));
    svg.appendChild(frame); groups.push(frame);

    return { svg, groups };
  }

  /* Draw each ring in turn. The path length is measured rather than guessed, so a circle of
     any radius takes the same visual time to appear. */
  function draw(groups) {
    groups.forEach((g, i) => {
      const shapes = [...g.children];
      const delay = i * 260;
      shapes.forEach((s) => {
        let len = 0;
        try { len = s.getTotalLength ? s.getTotalLength() : 0; } catch (_) { len = 0; }
        if (!len || s.getAttribute('fill') === 'currentColor') {
          /* the dots have no length to draw; fade them instead */
          s.style.opacity = '0';
          s.style.transition = 'opacity .5s ease ' + (delay + 240) + 'ms';
          requestAnimationFrame(() => { s.style.opacity = '1'; });
          return;
        }
        s.style.strokeDasharray = len;
        s.style.strokeDashoffset = len;
        s.style.transition = 'stroke-dashoffset 1.15s cubic-bezier(.22,.61,.36,1) ' + delay + 'ms';
        requestAnimationFrame(() => { s.style.strokeDashoffset = '0'; });
      });
    });
  }

  function mountKolams() {
    document.querySelectorAll('[data-kolam]').forEach((host) => {
      if (host.querySelector('.kolam')) return;
      const cfg = {
        rings: +(host.dataset.kolamRings || 4),
        petals: +(host.dataset.kolamPetals || 8),
        gap: +(host.dataset.kolamGap || 44),
        dots: host.dataset.kolamDots !== 'false'
      };
      const { svg, groups } = rangoli(cfg);
      host.appendChild(svg);
      if (!still) draw(groups);
    });
  }

  /* ─────────────────────────────── 2 · REVEAL ────────────────────────────── */

  function mountReveals() {
    const items = [...document.querySelectorAll('[data-reveal]')];
    if (!items.length) return;

    /* If motion is refused, or the browser has no observer, everything simply stays visible.
       The hidden state is added by script, never by the stylesheet, so a failure here can
       never leave content invisible. */
    if (still || !('IntersectionObserver' in window)) return;

    items.forEach((item) => {
      const kids = item.hasAttribute('data-reveal-children')
        ? [...item.children] : [item];
      kids.forEach((k, i) => {
        k.classList.add('will-reveal');
        k.style.transitionDelay = (i * 90) + 'ms';
      });
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const kids = e.target.hasAttribute('data-reveal-children')
          ? [...e.target.children] : [e.target];
        kids.forEach((k) => k.classList.add('is-revealed'));
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    items.forEach((i) => io.observe(i));
  }

  /* ─────────────────────────────── 3 · COUNT ─────────────────────────────── */

  function countUp(node, to, ms) {
    const fmt = (n) => n.toLocaleString('en-IN');
    if (still) { node.textContent = fmt(to); return; }
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    (function tick(now) {
      const t = Math.min(1, (now - t0) / ms);
      node.textContent = fmt(Math.round(to * ease(t)));
      if (t < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function mountCounters() {
    const nodes = [...document.querySelectorAll('[data-count]')];
    if (!nodes.length) return;
    if (still || !('IntersectionObserver' in window)) {
      nodes.forEach((n) => { n.textContent = (+n.dataset.count).toLocaleString('en-IN'); });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        countUp(e.target, +e.target.dataset.count, 1100);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    nodes.forEach((n) => { n.textContent = '0'; io.observe(n); });
  }


  /* ─────────────────────────────── 4 · BARS ──────────────────────────────── */

  /* A proportional bar grows to its share when it is reached. The widths live on the markup
     as data-w so the number and the graphic cannot drift apart, and the bar is correct with
     no script at all - it simply starts at its final width instead of growing to it. */
  function mountBars() {
    const bars = [...document.querySelectorAll("[data-gap-bar]")];
    if (!bars.length) return;

    const fill = (bar) => [...bar.children].forEach((seg) => {
      seg.style.width = (seg.dataset.w || 0) + "%";
    });

    if (still || !("IntersectionObserver" in window)) { bars.forEach(fill); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        fill(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.35 });
    bars.forEach((b) => io.observe(b));
  }


  /* ────────────────────────────── the watchdog ─────────────────────────────
     An IntersectionObserver that never delivers must not mean content that never appears.
     Delivery is tied to the rendering lifecycle, so a background tab, a throttled frame
     loop, an offscreen iframe or a headless capture can all leave callbacks unfired — and
     the failure mode of a reveal animation is a blank page, which is the worst possible one.

     So everything gets a deadline. After it passes, whatever has not been triggered is
     finished by hand: reveals become visible, counters print their value, bars take their
     width. Late is acceptable; invisible is not. */
  function watchdog(ms) {
    setTimeout(() => {
      document.querySelectorAll(".will-reveal:not(.is-revealed)")
        .forEach((k) => k.classList.add("is-revealed"));

      document.querySelectorAll("[data-count]").forEach((node) => {
        const want = (+node.dataset.count).toLocaleString("en-IN");
        if (node.textContent !== want) node.textContent = want;
      });

      /* The kolam draws itself from inside a requestAnimationFrame, which does not run in a
         context that is not compositing. A decorative pattern that never appears is a mild
         failure rather than a broken page, but on a site whose argument is partly its design
         it is still a failure. Finish it. */
      document.querySelectorAll(".kolam [style*=\"stroke-dashoffset\"]").forEach((s) => {
        if (s.style.strokeDashoffset !== "0") s.style.strokeDashoffset = "0";
      });
      document.querySelectorAll(".kolam circle[fill=\"currentColor\"]").forEach((d) => {
        if (d.style.opacity === "0") d.style.opacity = "1";
      });

      document.querySelectorAll("[data-gap-bar]").forEach((bar) => {
        [...bar.children].forEach((seg) => {
          if (!seg.style.width) seg.style.width = (seg.dataset.w || 0) + "%";
        });
      });
    }, ms);
  }

  /* ─────────────────────────────── boot ──────────────────────────────────── */

  function boot() { mountKolams(); mountReveals(); mountCounters(); mountBars(); watchdog(2600); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.EAKolam = { rangoli, remount: boot };
})();
