/* Ek Awaaz — language.

   One choice, remembered across pages and visits, applied to every string marked in the HTML
   and passed to the API so Smiti answers in the same language she was asked in.

   Honesty rule: this selector lists only the languages the INTERFACE is actually translated
   into. Speech understands far more than the interface is written in, and the two must not be
   conflated — claiming 22 languages while the buttons stay English is exactly the kind of
   overclaim this whole project is arguing against.

   Mark up with:
     <h2 data-i18n="hero.title">…</h2>
     <input data-i18n-ph="report.placeholder">
     <button data-i18n-aria="voice.start">
   Read the current choice anywhere with EAI18N.lang, and listen for 'ea:lang'. */

(function () {
  const KEY = 'ekawaaz.lang';

  /* Interface languages. Add one only when its strings below are actually complete. */
  const LANGS = [
    { code: 'en', label: 'English', native: 'English', bcp47: 'en-IN', dir: 'ltr' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी', bcp47: 'hi-IN', dir: 'ltr' }
  ];

  const STRINGS = {
    en: {
      'nav.new': "New report",
      'didi.thread1': "Tell me what happened, or ask me what you are owed.",
      'didi.thread2': "I will find who owns the problem, what clock that office is on, and what you can do if they miss it. You see all of it before anything is sent.",
      'nav.home': "Home",
      'nav.faq': "FAQs / Help",
      'nav.how': 'How it works',
      'nav.near': 'Near you',
      'nav.cases': 'My grievances',
      'nav.help': 'Help',
      'nav.signin': 'My cases',
      'lang.label': 'Language',
      'lang.note': 'The interface is in English and Hindi. You can speak in more.',
      'lang.speech': 'You can also speak in',

      'hero.eyebrow': 'Your complaint, the right office',
      'hero.cta': 'Tell us what happened',
      'hero.sub': 'Speak or type your problem in your own language. No ministry list, no categories.',

      'didi.eyebrow': 'Talk to Smiti Didi',
      'didi.title': 'Tell me what happened.',
      'didi.lede': 'Smiti asks one question at a time, in your language. She never asks you to name a department, and nothing is filed until you have read it back.',
      'didi.examples': 'Not sure how to start? Tap one of these.',
      'didi.placeholder': 'Type or speak. For example: the road to my house floods and nobody has come for three weeks.',
      'didi.start': 'Start with Smiti',
      'didi.speak': 'Speak instead, in your own language',

      'report.step': 'Step',
      'report.of': 'of',
      'report.what': 'What happened?',
      'report.enough': 'One or two sentences are enough.',
      'report.continue': 'Continue',
      'report.nothingSent': 'Nothing is sent until you press continue.',
      'report.noMinistry': 'You will not be asked to choose a ministry or a category. Mobile number only, no Aadhaar.',
      'report.answerHere': 'Type your answer, or press the mic to speak',

      'route.eyebrow': 'Nothing sent yet',
      'route.whereItGoes': 'Where it goes',
      'route.stronger': 'Stronger remedy you already hold',
      'route.noRoute': 'There is no online route for this',
      'route.match': 'Someone has already reported this',
      'route.assumed': 'We assumed this. Correct it if it is wrong.',
      'route.personal': 'Personal case',
      'route.send': 'Confirm and send',
      'route.beforeSend': 'Before you send this',

      'otp.title': 'One step before it goes out',
      'otp.phone': '10-digit mobile number',
      'otp.send': 'Send code',
      'otp.verify': 'Verify and send',
      'otp.demo': 'Demo mode, enter 123456',
      'otp.why': 'Your case is filed against your mobile number, so you can track the reply and nobody else can close it for you. No password, no Aadhaar.',

      'cases.title': 'My cases',
      'cases.empty': 'Nothing here yet.',
      'cases.day': 'Day',
      'cases.of21': 'of 21',
      'cases.confirm': 'Is it actually fixed?',
      'cases.fixed': 'Yes, it is fixed',
      'cases.notFixed': 'No, nothing has changed',
      'cases.partly': 'Partly',

      'join.add': 'Add my name',
      'join.already': 'Your name is already on this case.',
      'join.privacy': 'Your name is never shown to other signatories.',

      'common.back': 'Back',
      'common.close': 'Close',
      'common.prototype': 'An independent prototype. Not an official government website.'
    },

    hi: {
      'nav.home': "होम",
      'nav.faq': "सामान्य प्रश्न / मदद",
      'nav.how': 'यह कैसे काम करता है',
      'nav.near': 'आपके पास',
      'nav.cases': 'मेरी शिकायतें',
      'nav.help': 'मदद',
      'nav.signin': 'मेरी शिकायतें',
      'lang.label': 'भाषा',
      'lang.note': 'पन्ने अभी हिन्दी और अंग्रेज़ी में हैं। बोल आप और भाषाओं में सकते हैं।',
      'lang.speech': 'आप इनमें बोल भी सकते हैं',

      'hero.eyebrow': 'आपकी शिकायत, सही दफ़्तर',
      'hero.cta': 'बताइए क्या हुआ',
      'hero.sub': 'अपनी भाषा में बोलिए या लिखिए। न मंत्रालय चुनना है, न कोई श्रेणी।',

      'didi.eyebrow': 'स्मिति दीदी से बात कीजिए',
      'didi.title': 'बताइए, क्या हुआ।',
      'didi.lede': 'स्मिति एक बार में एक ही बात पूछती हैं, आपकी भाषा में। वे कभी विभाग का नाम नहीं पूछतीं, और जब तक आप पढ़ न लें, कुछ भेजा नहीं जाता।',
      'didi.examples': 'शुरू कैसे करें, समझ नहीं आ रहा? इनमें से कोई एक दबाइए।',
      'didi.placeholder': 'लिखिए या बोलिए। जैसे: मेरे घर का रास्ता बारिश में भर जाता है और तीन हफ़्ते से कोई नहीं आया।',
      'didi.start': 'स्मिति के साथ शुरू कीजिए',
      'didi.speak': 'बोलकर बताइए, अपनी भाषा में',

      'report.step': 'चरण',
      'report.of': 'में से',
      'report.what': 'क्या हुआ?',
      'report.enough': 'एक-दो वाक्य काफ़ी हैं।',
      'report.continue': 'आगे',
      'report.nothingSent': 'जब तक आप आगे नहीं दबाते, कुछ नहीं भेजा जाता।',
      'report.noMinistry': 'आपसे न मंत्रालय पूछा जाएगा, न श्रेणी। सिर्फ़ मोबाइल नंबर, आधार नहीं।',
      'report.answerHere': 'अपना जवाब लिखिए, या बोलने के लिए माइक दबाइए',

      'route.eyebrow': 'अभी कुछ भेजा नहीं गया',
      'route.whereItGoes': 'यह कहाँ जाएगी',
      'route.stronger': 'इससे मज़बूत रास्ता, जो पहले से आपका हक़ है',
      'route.noRoute': 'इसके लिए कोई ऑनलाइन रास्ता नहीं है',
      'route.match': 'यही बात कोई और पहले ही बता चुका है',
      'route.assumed': 'हमने यह मान लिया है। ग़लत हो तो बदल दीजिए।',
      'route.personal': 'निजी मामला',
      'route.send': 'पक्का कीजिए और भेजिए',
      'route.beforeSend': 'भेजने से पहले यह जान लीजिए',

      'otp.title': 'भेजने से पहले एक क़दम',
      'otp.phone': '10 अंकों का मोबाइल नंबर',
      'otp.send': 'कोड भेजिए',
      'otp.verify': 'जाँचिए और भेजिए',
      'otp.demo': 'यह नमूना है, 123456 डालिए',
      'otp.why': 'शिकायत आपके मोबाइल नंबर पर दर्ज होती है, ताकि जवाब आप तक पहुँचे और कोई और उसे बंद न कर सके। न पासवर्ड, न आधार।',

      'cases.title': 'मेरी शिकायतें',
      'cases.empty': 'अभी यहाँ कुछ नहीं है।',
      'cases.day': 'दिन',
      'cases.of21': '/ 21',
      'cases.confirm': 'क्या सच में ठीक हुआ?',
      'cases.fixed': 'हाँ, ठीक हो गया',
      'cases.notFixed': 'नहीं, कुछ नहीं बदला',
      'cases.partly': 'थोड़ा-बहुत',

      'join.add': 'मेरा नाम भी जोड़िए',
      'join.already': 'आपका नाम पहले से इस पर है।',
      'join.privacy': 'आपका नाम बाक़ी लोगों को कभी नहीं दिखाया जाता।',

      'common.back': 'पीछे',
      'common.close': 'बंद कीजिए',
      'common.prototype': 'यह एक स्वतंत्र नमूना है। सरकारी वेबसाइट नहीं।'
    }
  };

  function read() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && STRINGS[saved]) return saved;
    } catch (e) { /* private window, or storage blocked */ }
    /* Fall back to what the browser asks for, then English. */
    const want = (navigator.languages || [navigator.language || 'en']).map((l) => String(l).slice(0, 2));
    return want.find((l) => STRINGS[l]) || 'en';
  }

  let current = read();

  function t(key, fallback) {
    const table = STRINGS[current] || STRINGS.en;
    return table[key] || STRINGS.en[key] || fallback || key;
  }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const v = t(el.getAttribute('data-i18n'), null);
      if (v) el.textContent = v;
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      const v = t(el.getAttribute('data-i18n-ph'), null);
      if (v) el.setAttribute('placeholder', v);
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const v = t(el.getAttribute('data-i18n-aria'), null);
      if (v) el.setAttribute('aria-label', v);
    });
    const meta = LANGS.find((l) => l.code === current) || LANGS[0];
    document.documentElement.lang = meta.bcp47;
    document.documentElement.dir = meta.dir;
  }

  function set(code) {
    if (!STRINGS[code] || code === current) return;
    current = code;
    try { localStorage.setItem(KEY, code); } catch (e) { /* fine, it just will not persist */ }
    apply();
    document.dispatchEvent(new CustomEvent('ea:lang', { detail: { lang: code, bcp47: bcp47() } }));
  }

  function bcp47() {
    return (LANGS.find((l) => l.code === current) || LANGS[0]).bcp47;
  }

  /* ---- the control ---- */

  const CSS = `
  .ea-lang{position:relative;display:inline-block}
  .ea-lang>button{display:flex;align-items:center;gap:7px;border:1px solid #cbd5df;background:#fff;
    border-radius:4px;padding:8px 11px;color:#102a43;font:700 12px Manrope,Arial,sans-serif;cursor:pointer;
    min-height:38px}
  .ea-lang>button:hover{border-color:#1d4ed8;color:#1d4ed8}
  .ea-lang>button:focus-visible{outline:2px solid #1d4ed8;outline-offset:2px}
  .ea-lang>button i{font-style:normal;font-size:13px}
  .ea-lang>button svg{width:11px;height:11px;opacity:.6}
  .ea-lang-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:60;min-width:196px;
    background:#fff;border:1px solid #cbd5df;border-radius:5px;box-shadow:0 14px 30px #102a4326;
    padding:6px;display:none}
  .ea-lang.open .ea-lang-menu{display:block}
  .ea-lang-menu button{display:flex;width:100%;align-items:baseline;gap:9px;border:0;background:none;
    text-align:left;padding:10px 11px;border-radius:4px;cursor:pointer;
    font:600 14px Manrope,Arial,sans-serif;color:#102a43;min-height:44px}
  .ea-lang-menu button:hover{background:#f1f5f8}
  .ea-lang-menu button[aria-current="true"]{background:#e8eefb;color:#1d4ed8}
  .ea-lang-menu button small{color:#5d6b79;font-weight:500;font-size:12px}
    `;

  const CHEV = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 4l4 4 4-4"/></svg>';

  function mount(host) {
    if (!host || host.dataset.eaLang) return;
    host.dataset.eaLang = '1';

    const wrap = document.createElement('div');
    wrap.className = 'ea-lang';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');

    const menu = document.createElement('div');
    menu.className = 'ea-lang-menu';
    menu.setAttribute('role', 'menu');

    function paintButton() {
      const meta = LANGS.find((l) => l.code === current) || LANGS[0];
      btn.innerHTML = '<i>' + meta.native + '</i>' + CHEV;
      btn.setAttribute('aria-label', t('lang.label') + ': ' + meta.label);
    }

    function paintMenu() {
      menu.innerHTML = LANGS.map((l) =>
        '<button type="button" role="menuitem" data-lang="' + l.code + '" aria-current="'
        + (l.code === current) + '"><span>' + l.native + '</span><small>' + l.label + '</small></button>'
      ).join('');
      menu.querySelectorAll('[data-lang]').forEach((b) =>
        b.addEventListener('click', () => { set(b.dataset.lang); close(); btn.focus(); }));
    }

    const open = () => { wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); };
    const close = () => { wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };

    btn.addEventListener('click', () => (wrap.classList.contains('open') ? close() : open()));
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.addEventListener('ea:lang', () => { paintButton(); paintMenu(); });

    paintButton(); paintMenu();
    wrap.append(btn, menu);
    host.replaceWith(wrap);
  }

  function init() {
    const style = document.createElement('style');
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
    /* Replace whatever language control the page already had. */
    document.querySelectorAll('[data-lang-mount], .lang-button').forEach(mount);
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.EAI18N = {
    get lang() { return current; },
    get bcp47() { return bcp47(); },
    get languages() { return LANGS.slice(); },
      t, set, apply
  };
})();
