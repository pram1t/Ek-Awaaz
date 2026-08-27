/* Ek Awaaz — page motion: entrance reveals, counters, proportional bars.
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

  /* The kolam generator that used to live here has been removed. It produced concentric
     rings of circles around a pulli dot grid, and at the opacity a page background needs
     it read as a field of bubbles rather than as a drawn kolam. The authored ornaments do
     that job properly. What follows — the entrance reveals, the counters and the
     proportional bar — is unrelated and stays. */

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
    /* Start near the value, not at zero. A wrong number on screen is a wrong number,
       however briefly, and this page is an argument about a number. */
    const from = Math.round(to * 0.88);
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    (function tick(now) {
      const t = Math.min(1, (now - t0) / ms);
      node.textContent = fmt(Math.round(from + (to - from) * ease(t)));
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
        countUp(e.target, +e.target.dataset.count, 700);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    /* Rendered at its true value from the first paint. The animation replaces a correct
       number with a nearly-correct one for 700ms; it never replaces it with zero. */
    nodes.forEach((n) => { n.textContent = (+n.dataset.count).toLocaleString('en-IN'); io.observe(n); });
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

      document.querySelectorAll("[data-gap-bar]").forEach((bar) => {
        [...bar.children].forEach((seg) => {
          if (!seg.style.width) seg.style.width = (seg.dataset.w || 0) + "%";
        });
      });
    }, ms);
  }

  /* ─────────────────────────────── boot ──────────────────────────────────── */

  function boot() { mountReveals(); mountCounters(); mountBars(); watchdog(2600); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.EAMotion = { remount: boot };
})();
