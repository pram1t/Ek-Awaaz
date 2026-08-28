/* Ek Awaaz — browser API client.
   Load this BEFORE session.js. It exposes window.EAAPI.

   Every call fails soft: on a network or server error it returns { error, offline:true } rather
   than throwing, so a page can show an honest message instead of dying mid-journey. */

(function () {
  const BASE = '/api';

  async function call(path, { method = 'GET', body = null } = {}) {
    try {
      const res = await fetch(BASE + path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return Object.assign({ error: data.error || `Request failed (${res.status})` }, data);
      return data;
    } catch (err) {
      return { error: 'We could not reach the server. Nothing was sent.', offline: true, detail: err.message };
    }
  }

  /* Draft lives on the device until the OTP — nothing reaches the server before consent.
     sessionStorage, so it clears when the tab closes. */
  const DRAFT = 'ekawaaz.draft';
  const draft = {
    read() { try { return JSON.parse(sessionStorage.getItem(DRAFT) || '{}'); } catch { return {}; } },
    patch(changes) {
      const next = Object.assign(draft.read(), changes);
      sessionStorage.setItem(DRAFT, JSON.stringify(next));
      return next;
    },
    clear() { sessionStorage.removeItem(DRAFT); }
  };

  window.EAAPI = {
    draft,

    health: () => call('/health'),

    /* Step 1 — the citizen has said what happened. */
    intake: (text) => call('/intake', { method: 'POST', body: { text } }),

    /* One turn of the intake: the next question, given what has been said. */
    nextQuestion: (payload) => call('/next', { method: 'POST', body: payload }),

    /* The conversation. The transcript travels with every turn — the server keeps none of it, so a
       reload resumes and no instance holds anybody's intake hostage. */
    chat: (messages, text, domain) => call('/chat', { method: 'POST', body: { messages, text, domain } }),
    chatSummary: (messages) => call('/chat/summary', { method: 'POST', body: { messages } }),

    /* Our own fixed lines, in the citizen's language. */
    say: (lines, lang) => call('/say', { method: 'POST', body: { lines, lang } }),

    /* Speech cannot go through call() — that parses JSON, and /tts answers with audio bytes.
       Returns a blob URL the caller plays, or an error it can ignore: if Smiti cannot be heard
       the words are still on screen, so silence is an acceptable failure and a dialog is not. */
    speak: async (text, lang) => {
      try {
        const res = await fetch(BASE + '/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: String(text || '').slice(0, 900), lang: lang || 'en-IN' })
        });
        if (!res.ok) {
          const why = await res.json().catch(() => ({}));
          return { error: why.error || 'no audio', status: res.status };
        }
        const blob = await res.blob();
        return {
          url: URL.createObjectURL(blob),
          lang: res.headers.get('X-Speech-Lang') || lang || null,
          cached: res.headers.get('X-Speech-Cached') === 'true'
        };
      } catch (err) {
        return { error: 'could not reach the speech service', offline: true };
      }
    },

    /* Raw audio in, text out — the fallback for a browser with no speech recognition of its own,
       and the better engine for Indic languages either way. */
    listen: async (blob, lang) => {
      try {
        const res = await fetch(BASE + '/stt' + (lang ? '?lang=' + encodeURIComponent(lang) : ''), {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'audio/webm' },
          body: blob
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return Object.assign({ error: data.error || 'could not transcribe' }, data);
        return data;
      } catch (err) {
        return { error: 'could not reach the speech service', offline: true };
      }
    },

    /* The case as the citizen will read it back: named fields, not the transcript. */
    summarise: (payload) => call('/summarise', { method: 'POST', body: payload }),

    /* Step 3 — the route screen: office, reason, stronger remedy, joinder match. */
    route: (payload) => call('/route', { method: 'POST', body: payload }),

    /* Mock OTP. The hint field carries the demo code so the UI can show it in plain sight. */
    sendOtp: (phone) => call('/otp/send', { method: 'POST', body: { phone } }),
    verifyOtp: (phone, code) => call('/otp/verify', { method: 'POST', body: { phone, code } }),

    /* Step 4 — file it. */
    fileCase: (payload) => call('/cases', { method: 'POST', body: payload }),

    /* Public wall — how joinder is actually reached. */
    nearby: (state) => call('/cases' + (state ? `?state=${encodeURIComponent(state)}` : '')),
    getCase: (code) => call('/cases/' + encodeURIComponent(code)),

    /* Joinder. */
    support: (code, phone, otp, note) =>
      call(`/cases/${encodeURIComponent(code)}/support`, { method: 'POST', body: { phone, otp, note } }),

    /* Closure gate — verdict is 'fixed' | 'not_fixed' | 'partly'. */
    confirm: (code, phone, verdict) =>
      call(`/cases/${encodeURIComponent(code)}/confirm`, { method: 'POST', body: { phone, verdict } }),

    /* Simulated officer reply + plain-language rewrite. Clearly mocked; used for the demo. */
    simulateReply: (code, language) =>
      call(`/cases/${encodeURIComponent(code)}/simulate-reply`, { method: 'POST', body: { language } }),

    /* The case record — every event, plus the two things a citizen can do about it. */
    timeline: (code) => call('/cases/' + encodeURIComponent(code) + '/timeline'),
    replyToCase: (code, phone, otp, text) =>
      call('/cases/' + encodeURIComponent(code) + '/reply', { method: 'POST', body: { phone, otp, text } }),
    askCase: (code, question) =>
      call('/cases/' + encodeURIComponent(code) + '/ask', { method: 'POST', body: { question } }),

    myCases: (phone) => call('/me/' + encodeURIComponent(phone)),

    /* The one fact no grievance can supply. Optional — nothing is gated on it. */
    setName: (phone, otp, name) =>
      call('/me/' + encodeURIComponent(phone) + '/name', { method: 'POST', body: { otp, name } }),
    dashboard: () => call('/dashboard'),
    remedyTable: () => call('/reference/remedies'),
    routingTable: () => call('/reference/routing')
  };
})();
