# Ek Awaaz

**Citizen grievance routing and remedy platform.** An independent prototype for the
*Build What Moves India* hackathon. **Not an official government product, and carrying no
government endorsement.**

The premise: India's central grievance portal solved *intake* in May 2026 (Samadhan Didi, DARPG +
Bhashini — speak in any of 22 languages, classified automatically). Two things it did not solve:

1. **Jurisdiction.** A broken village road belongs to a Gram Panchayat. No central ministry can
   fix it — local government is Entry 5 of the State List. A perfectly classified complaint still
   dies.
2. **Remedy.** Most grievances have a *stronger* remedy than a grievance — a statutory forum with
   a binding deadline and often money attached — and the citizen is never told. CPGRAMS silently
   substitutes a non-statutory 21-day request for a legal right.

Ek Awaaz never asks which ministry. It infers the tier, routes to the office that can act, names
the stronger remedy before you commit, lets neighbours join one case instead of filing fifty, and
refuses to close a case until a citizen says it is fixed.

---

## Run it

```bash
npm install
cp .env.example .env      # then put your key in it
npm start                 # http://localhost:3000
```

`.env`:

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | **Required for the real thing.** Without it the model layer falls back to deterministic keyword rules and every response is tagged `aiSource: "fallback"`. |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini`. Any OpenAI model works. |
| `PORT` | Defaults to 3000. |
| `MOCK_OTP` | Defaults to `123456`. Shown on screen in plain sight. |

Check it came up correctly:

```bash
curl -s localhost:3000/api/health
```

`"ai":"live"` means the key is working. `"ai":"fallback"` means classification is running on
keyword rules — the journey still completes, but the intelligence is not real.

Reseed the database:

```bash
npm run seed
```

---

## Architecture

One Node process serves the static pages **and** the API. No build step, no framework, no
separate frontend. SQLite is seeded on boot from `data/seed.json`, so a fresh deploy always
starts with the same synthetic case history and no persistent disk is required.

```
server.js              express: static + /api, blocks working dirs from being served
server/db.js           SQLite schema, seeding, joinder, escalation, closure
server/ai.js           the model layer — every function degrades to deterministic rules
server/api.js          HTTP endpoints
data/routing.json      jurisdiction routing table — hand-authored from statute
data/remedies.json     the remedy ladder — forum, clock, teeth, statutory provision
data/seed.json         synthetic case history + real DARPG figures
api-client.js          browser client (window.EAAPI) — load before session.js
index.html lodging.html dashboard.html styles.css app.js session.js
```

### What is real, and what is mocked

The hackathon brief instructs mocking personal data, payments, OTPs and government systems. It
does not permit faking the intelligence.

**Real** — classification, follow-up generation, the routing decision and its stated reason, the
remedy-ladder lookup with its date gates, joinder, deduplication, signature counting, escalation
thresholds, the citizen-confirmed closure gate, the plain-language rewrite.

**Mocked, as instructed** — OTP, identity, all personal data, filing into CPGRAMS / EPFiGMS /
RBI CMS / Meri Sadak / any state portal, officer actions, Action Taken Reports, timestamps.

**Designed but not built** — the Bombay High Court compensation claim (shown as a routing
destination). And the **Panchayat-tier API does not exist in reality**; the fallback to a state
CM helpline *is* the honest answer, not a gap in the prototype.

**No live government system is contacted anywhere in this codebase.**

---

## API

| Method | Path | Does |
|---|---|---|
| GET | `/api/health` | Whether the model is live or falling back |
| POST | `/api/intake` | `{text}` → domain, title, summary, 2–3 follow-ups, disambiguator, warnings |
| POST | `/api/route` | draft → office, reason, legal basis, channel, **stronger remedy**, **joinder match** |
| POST | `/api/otp/send` · `/api/otp/verify` | Mock OTP. Returns the code in `hint` so the demo cannot dead-end |
| POST | `/api/cases` | File it. Requires phone + OTP |
| GET | `/api/cases` | Public wall — what is reported near you |
| GET | `/api/cases/:code` | One case |
| POST | `/api/cases/:code/support` | **Joinder.** One signature per verified mobile |
| POST | `/api/cases/:code/confirm` | **Closure gate.** `fixed` / `not_fixed` / `partly` |
| POST | `/api/cases/:code/simulate-reply` | Simulated officer ATR + plain-language rewrite |
| GET | `/api/me/:phone` | Cases filed and joined |
| GET | `/api/dashboard` | Aggregates, recurrence, real DARPG figures |
| GET | `/api/reference/remedies` · `/api/reference/routing` | The two lookup tables, as data |

### The two mechanics worth reading the code for

**Joinder** (`server/db.js` → `addSignature`). Fifty villagers with one broken road currently file
fifty cases: fifty IDs, fifty officers, fifty templated closures. Here the second person *signs*
the existing case. Fifty filings become one case with fifty signatories and **one** Action Taken
Report. More citizens filing means *less* officer work, not more.

Anti-gaming: one signature per verified mobile per case; escalation thresholds scaled to the
target rather than an absolute count; counts public, identities never exposed to other
signatories; a signature can only prioritise a public item, never trigger action against a person.

**The remedy gate** (`server/api.js` → `remedyFor`). Remedies carry a gate. The RBI Ombudsman
opens only once the bank has had 30 days, so the API computes the elapsed days and returns either
`before_gate` ("your bank gets 30 days first, and here is the date this opens") or `after_gate`
("your bank has had 37 days — the Ombudsman can award up to ₹20 lakh"). Naming a remedy is **not
legal advice**, and every response carries that disclaimer.

---

## Deploy

Any host that runs Node 20+ and gives you a public URL. No database service needed.

- Build: `npm install`
- Start: `npm start`
- Environment: `OPENAI_API_KEY`, `OPENAI_MODEL`, and let the host set `PORT`

Verify after deploying:

1. `/api/health` reports `"ai":"live"` — **if it says `fallback`, the key did not reach the host.**
2. The public link opens with no access request, in a private window.
3. The OTP screen shows the demo code in plain sight.

---

## Sources for the two tables

`data/routing.json` and `data/remedies.json` are hand-authored from: the Seventh Schedule
(Entry 5 and Entry 13, State List; Entry 23, Union List); Articles 243G and 243W with the
Eleventh and Twelfth Schedules; the National Highways Act 1956 and NHAI Act 1988; the Cantonments
Act 2006; the National Food Security Act 2013 (ss. 14–16); the Electricity Act 2003 (ss. 42(5)
and 42(6)); the Reserve Bank Integrated Ombudsman Scheme 2021; the Income-tax Act 1961 (s. 244A);
the EPF & MP Act 1952 (s. 7I); the MGNREG Act 2005; the Real Estate (Regulation and Development)
Act 2016; the Consumer Protection Act 2019; *High Court on Its Own Motion v. State of Maharashtra*
(Bombay HC, 14 October 2025); and DARPG's Office Memorandum of 23 August 2024.

Full annotated dossier with citations: `E:\build-what-moves-india\Ek-Awaaz-Architecture.docx`.

Accessibility targets: GIGW 3.0, WCAG 2.1 Level AA, IS 17802 — obligations under sections 40, 42
and 46 of the Rights of Persons with Disabilities Act 2016.

Identity is **mobile OTP only**. Aadhaar is deliberately not used: under the Aadhaar Act 2016 as
amended in 2019, no individual may be compelled to authenticate unless a law made by Parliament
provides for it, and there is no such law for grievance filing.
