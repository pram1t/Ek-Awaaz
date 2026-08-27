/* Ek Awaaz — the speak-instead control.

   Collapsed it is a mic button. Pressed, it expands rightward into a bar carrying a live
   level meter and a live transcript, then hands the text back.

   Two honest rules:
   - The level bars are driven by real microphone amplitude through an AnalyserNode, never by
     a CSS animation. If the bars move, sound is genuinely reaching us.
   - Transcription uses the browser's own speech recognition. Where that does not exist the
     control says so plainly and keeps the meter running, rather than pretending to listen.

   Usage:
     EAVoice.attach({ button, mount, onFinal, onInterim, lang });          */

(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const BARS = 28;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CSS = `
  /* The button and the panel are SIBLINGS in the row that already exists, not children of a
     wrapper. A wrapper would be a flex item sizing itself from its own content, so the panel's
     growth would resolve against a container that has not sized yet — the panel stayed 2px.
     As direct children of a row with a definite width, flex-grow resolves correctly. */
  .ea-voice-host{--h:44px;position:relative}
  /* Everything in the row except the button and the panel steps aside while the panel is
     open. Without this the clip-path seam sweeps across whatever the row already holds — a
     blue primary button, a focused textarea — and that shows as a coloured strip at the
     leading edge of the animation. */
  .ea-voice-host.ea-open > *:not(.ea-voice-btn):not(.ea-voice-panel){visibility:hidden}
  .ea-voice-btn{flex:0 0 var(--h);width:var(--h);height:var(--h);border:0;border-radius:50%;
    background:#241a14;color:#fff;display:grid;place-items:center;cursor:pointer;position:relative;
    transition:background .2s ease}
  .ea-voice-btn:hover{background:#8c2416}
  .ea-voice-btn:focus-visible{outline:2px solid #8c2416;outline-offset:3px}
  .ea-voice-btn svg{width:19px;height:19px;display:block}
  .ea-voice-btn[aria-pressed="true"]{background:#a3231b}
  .ea-voice-btn[aria-pressed="true"]::after{content:"";position:absolute;inset:-5px;border-radius:50%;
    border:2px solid #a3231b;opacity:.5;animation:ea-pulse 1.7s ease-out infinite}
  @keyframes ea-pulse{0%{transform:scale(.86);opacity:.6}100%{transform:scale(1.28);opacity:0}}
  @media(prefers-reduced-motion:reduce){.ea-voice-btn[aria-pressed="true"]::after{animation:none;opacity:.35}}

  /* The panel is taken out of flow and anchored across the row, then revealed left-to-right
     with clip-path. In flex it refused to size: an inline width:162px with max-width:none and
     flex:0 0 auto still computed 1.6px. Absolute positioning removes that dependency, and the
     clip reveal is a truer "expands to the right" than a width tween anyway. */
  .ea-voice-panel{position:absolute;z-index:2;left:calc(var(--h) + 12px);right:0;top:50%;
    transform:translateY(-50%);height:var(--h);
    display:flex;align-items:center;gap:12px;padding:0 15px 0 13px;
    border:1px solid #e4d8c4;border-radius:calc(var(--h)/2);background:#fff;
    clip-path:inset(0 100% 0 0 round calc(var(--h)/2));opacity:0;pointer-events:none;
    isolation:isolate;will-change:clip-path,opacity;
    transition:clip-path .34s cubic-bezier(.22,.61,.36,1),opacity .18s ease}
  /* The open state is applied inline by reveal()/conceal() below. An .ea-open descendant rule
     matched and declared opacity:1 here, yet the computed value stayed 0 — so the reveal is
     driven from JS, which is deterministic. CSS keeps only the transition. */
  @media(prefers-reduced-motion:reduce){.ea-voice-panel{transition:none}}

  .ea-voice-meter{flex:0 0 auto;display:flex;align-items:center;gap:2px;height:22px}
  .ea-voice-meter i{display:block;width:2px;height:100%;border-radius:1px;background:#bcb0ab;
    transform:scaleY(.12);transform-origin:center;transition:transform .07s linear,background .2s ease}
  .ea-voice-host.ea-live .ea-voice-meter i{background:#8c2416}

  .ea-voice-text{flex:1 1 auto;min-width:0;font:500 13px/1.35 Mukta,Arial,sans-serif;color:#2e2118;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
  /* rtl only once there is a transcript, so a long one clips at the start and the newest
     words stay in view. On hint text it would just move the ellipsis to the wrong side. */
  .ea-voice-text.live{direction:rtl}
  .ea-voice-text span{direction:ltr;unicode-bidi:plaintext}
  .ea-voice-text .interim{color:#9a8674}
  .ea-voice-text.hint{color:#9a8674;font-weight:400;white-space:normal;direction:ltr}

  .ea-voice-lang{flex:0 0 auto;border:1px solid #eadfcc;background:#fdf9f1;border-radius:3px;
    padding:5px 7px;font:700 10px Mukta,sans-serif;letter-spacing:.05em;color:#7a6455;cursor:pointer}
  .ea-voice-lang:hover{border-color:#8c2416;color:#8c2416}
  .ea-voice-use{flex:0 0 auto;border:0;border-radius:3px;background:#8c2416;color:#fff;
    padding:8px 11px;font:800 11px Mukta,sans-serif;cursor:pointer;visibility:hidden}
  .ea-voice-use.on{visibility:visible}
  .ea-voice-use:hover{background:#6e1b10}
  `;

  const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
    + '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/>'
    + '<path d="M5.5 11.5A6.5 6.5 0 0 0 18.5 11.5"/><path d="M12 18v3"/></svg>';
  const STOP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>';

  let injected = false;
  function injectCss() {
    if (injected) return;
    const s = document.createElement('style');
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
    injected = true;
  }

  const LANGS = [
    { code: 'en-IN', label: 'EN' },
    { code: 'hi-IN', label: 'हिं' }
  ];

  function attach(opts) {
    const { button, mount, onFinal, onInterim } = opts;
    if (!button || !mount) return null;
    injectCss();

    let langIndex = LANGS.findIndex((l) => l.code === (opts.lang || 'en-IN'));
    if (langIndex < 0) langIndex = 0;

    /* ---- build ---- */
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ea-voice-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Speak instead of typing');
    btn.innerHTML = MIC;

    const panel = document.createElement('div');
    panel.className = 'ea-voice-panel';

    const meter = document.createElement('div');
    meter.className = 'ea-voice-meter';
    meter.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < BARS; i++) meter.appendChild(document.createElement('i'));
    const bars = [...meter.children];

    const text = document.createElement('p');
    text.className = 'ea-voice-text hint';
    text.setAttribute('aria-live', 'polite');
    text.style.margin = '0';
    text.textContent = 'Listening…';

    const lang = document.createElement('button');
    lang.type = 'button';
    lang.className = 'ea-voice-lang';
    lang.textContent = LANGS[langIndex].label;
    lang.setAttribute('aria-label', 'Change the language you are speaking');

    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'ea-voice-use';
    use.textContent = 'Use this';

    panel.append(meter, text, lang, use);
    mount.replaceWith(btn);
    btn.after(panel);
    const host = btn.parentElement;
    host.classList.add('ea-voice-host');

    /* A literal px radius. Assigning `inset(... round calc(var(--h)/2))` through the CSSOM
       fails validation and the setter is ignored with no error thrown. */
    const RADIUS = ((parseFloat(getComputedStyle(host).getPropertyValue('--h')) || 44) / 2) + 'px';
    function reveal() {
      panel.style.clipPath = 'inset(0 0 0 0 round ' + RADIUS + ')';
      panel.style.opacity = '1';
      panel.style.pointerEvents = 'auto';
    }
    function conceal() {
      panel.style.clipPath = 'inset(0 100% 0 0 round ' + RADIUS + ')';
      panel.style.opacity = '0';
      panel.style.pointerEvents = 'none';
    }

    /* ---- state ---- */
    let stream = null, ctx = null, analyser = null, raf = 0, rec = null;
    let finalText = '', interimText = '', open = false;

    function paint() {
      const has = (finalText + interimText).trim();
      text.classList.toggle('hint', !has);
      text.classList.toggle('live', !!has);
      if (!has) { text.textContent = rec ? 'Listening…' : 'Recording…'; use.classList.remove('on'); return; }
      text.innerHTML = '<span>' + esc(finalText) + (interimText ? '<i class="interim"> ' + esc(interimText) + '</i>' : '') + '</span>';
      use.classList.toggle('on', !!finalText.trim());
    }
    const esc = (t) => String(t).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

    function say(msg) { finalText = ''; interimText = ''; text.classList.add('hint'); text.classList.remove('live'); text.textContent = msg; use.classList.remove('on'); }

    function loop() {
      if (!analyser) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const step = Math.floor(data.length / BARS) || 1;
      for (let i = 0; i < BARS; i++) {
        let sum = 0;
        for (let k = 0; k < step; k++) sum += data[i * step + k] || 0;
        const v = (sum / step) / 255;
        /* a floor so the bar never fully disappears, and a curve so speech reads clearly */
        bars[i].style.transform = 'scaleY(' + Math.max(0.12, Math.min(1, Math.pow(v, 0.65) * 1.6)).toFixed(3) + ')';
      }
      raf = requestAnimationFrame(loop);
    }

    async function start() {
      open = true;
      host.classList.add('ea-open');
      reveal();
      if (opts.onOpen) opts.onOpen();
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('aria-label', 'Stop and use what I said');
      btn.innerHTML = STOP;
      finalText = ''; interimText = '';
      say(SR ? 'Listening…' : 'Recording…');   /* say() clears .live, so this reads left to right */

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        say(err && err.name === 'NotAllowedError'
          ? 'The microphone is blocked in your browser. Type instead.'
          : 'No microphone found. Type instead.');
        host.classList.remove('ea-live');
        return;
      }

      host.classList.add('ea-live');
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        src.connect(analyser);
        loop();
      } catch (_) { /* meter is a nicety; transcription still matters */ }

      if (!SR) {
        say('This browser cannot turn speech into text. The level shows we can hear you — type your words, or use Chrome.');
        return;
      }

      rec = new SR();
      rec.lang = LANGS[langIndex].code;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText = (finalText + ' ' + chunk).trim();
          else interimText += chunk;
        }
        paint();
        if (onInterim) onInterim((finalText + ' ' + interimText).trim());
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') say('Speech recognition is blocked. Type instead.');
        else if (e.error === 'no-speech') say('I did not catch that. Say it again.');
      };
      rec.onend = () => { if (open) { try { rec.start(); } catch (_) {} } };
      try { rec.start(); } catch (_) { say('Could not start listening. Type instead.'); }
    }

    function stop(commit) {
      open = false;
      host.classList.remove('ea-open', 'ea-live');
      conceal();
      if (opts.onClose) opts.onClose();
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Speak instead of typing');
      btn.innerHTML = MIC;

      if (rec) { rec.onend = null; try { rec.stop(); } catch (_) {} rec = null; }
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (ctx) { try { ctx.close(); } catch (_) {} ctx = null; }
      analyser = null;
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      bars.forEach((b) => { b.style.transform = 'scaleY(.12)'; });

      const said = (finalText + ' ' + interimText).trim();
      if (commit && said && onFinal) onFinal(said);
      finalText = ''; interimText = '';
    }

    btn.addEventListener('click', () => (open ? stop(true) : start()));
    use.addEventListener('click', () => stop(true));
    lang.addEventListener('click', () => {
      langIndex = (langIndex + 1) % LANGS.length;
      lang.textContent = LANGS[langIndex].label;
      if (rec) { rec.lang = LANGS[langIndex].code; rec.onend = null; try { rec.stop(); } catch (_) {} rec = null; open = false; start(); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) stop(false); });
    window.addEventListener('pagehide', () => { if (open) stop(false); });

    /* Let the page follow the site language selector without rebuilding the control. */
    function setLang(code) {
      const i = LANGS.findIndex((l) => l.code === code);
      if (i < 0 || i === langIndex) return;
      langIndex = i;
      lang.textContent = LANGS[i].label;
      if (rec) rec.lang = code;
    }

    return { start, stop, setLang, el: host, button: btn, panel: panel, supported: !!SR,
             isOpen: function () { return host.classList.contains('ea-open'); } };
  }

  window.EAVoice = { attach, transcriptionSupported: !!SR };
})();
