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

    myCases: (phone) => call('/me/' + encodeURIComponent(phone)),

    /* The one fact no grievance can supply. Optional — nothing is gated on it. */
    setName: (phone, otp, name) =>
      call('/me/' + encodeURIComponent(phone) + '/name', { method: 'POST', body: { otp, name } }),
    dashboard: () => call('/dashboard'),
    remedyTable: () => call('/reference/remedies'),
    routingTable: () => call('/reference/routing')
  };
})();
