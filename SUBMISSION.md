# Ek Awaaz · एक आवाज़

**A rebuild of India's central grievance portal, CPGRAMS.**

Live: **https://ek-awaaz.vercel.app**
Code: **https://github.com/pram1t/Ek-Awaaz**

An independent prototype. Not a government product, and it says so on every page and every case.

---

## 1. The number this is about

In March 2026 the central government received **1,89,189** grievances through CPGRAMS and
recorded **1,81,279** as redressed inside the same month. A 95.8% disposal rate.

That figure is the reason this project exists, and it is on the homepage — not hidden, and not
spun. Because *disposed* means a file was closed. It does not mean a road was repaired, a
pension was paid, or a transformer was replaced. Nothing in the number records whether the
person who complained agrees with it, and nothing in the process asks them.

Everything below follows from that one gap.

*Source: DARPG monthly CPGRAMS report, March 2026, PIB PRID 2252591.*

---

## 2. Four failures, and what was built for each

### 2.1 The citizen is made to do the state's filing

CPGRAMS opens with a ministry list. To be heard you must already know which of roughly ninety
central ministries owns your problem — and if your problem is a village road, **none of them
does**. A road inside a panchayat is panchayat work under Article 243G and the Eleventh
Schedule. A grievance filed to Delhi about it is correctly rejected, and the citizen learns
nothing except that the state does not want to hear from them.

**Built:** you describe the problem in your own words and are never asked to name a department.
The system routes it. **15 domains** are mapped to a specific officer with the provision that
makes them answerable:

| Problem | Who is actually answerable | Under |
|:--|:--|:--|
| Village road, pothole | Block Development Officer / Gram Panchayat | Art. 243G, Eleventh Schedule |
| National highway | Project Director, NHAI | Entry 23, Union List |
| Municipal water | Executive Engineer, water supply | Art. 243W, Twelfth Schedule |
| Electricity | Executive Engineer of the licensee | Electricity Act 2003, s.42 |
| Provident fund | Regional PF Commissioner | EPF & MP Act 1952, s.7I |
| Ration short of card | District Grievance Redressal Officer | NFSA 2013, ss.14–16 |
| MGNREGA wages | Programme Officer, block | MGNREGA 2005, Sch. II ¶29 |
| Bank debit | Nodal officer, then RBI Ombudsman | RB-IOS 2021 |
| Tax refund | CPC, Income Tax | Income-tax Act 1961, s.244A |
| Builder possession | State RERA | RERA 2016, s.31 |
| Railways | Divisional Railway Manager | Railways Act 1989 |
| Telecom | Appellate Authority of the operator | TRAI Act 1997 |
| PM-KISAN | State Nodal Officer | Scheme guidelines |
| Departmental inaction | Grievance officer, then the appeal | DARPG OM, 23 Aug 2024 |
| Bribe demanded | Chief Vigilance Officer | CVC Act 2003 |

The route screen shows the office, the reason it is that office, and the provision. A citizen
who disagrees can see exactly what the system concluded and why.

### 2.2 A grievance is often the weakest thing you can file

For a disputed bank debit, the RBI Ombudsman can award compensation up to ₹20 lakh. A
grievance cannot. For a late tax refund, s.244A entitles you to interest. For a ration
shortfall, NFSA s.15 names an officer with a statutory duty. Filing a general grievance
instead is not neutral — it is choosing the weaker of two available paths, usually without
knowing the stronger one exists.

**Built:** **12 statutory remedies** on file, **11 implemented**, each with its forum, its
teeth, its clock and its provision. The stronger remedy is shown **before** you file, not after
you fail.

Remedies are gated, and the gates are enforced. A remedy that arises only after 30 days is not
offered on day one; a remedy conditional on an injury is not offered without one. And scope is
checked: the Bombay High Court's pothole compensation scale is Maharashtra law, so a Bihar case
is told *"not settled law in Bihar, and the amounts are not fixed in this state"* while a
Maharashtra case is told *"applies only if the road caused an injury."* Same question, two
states, two correct answers.

### 2.3 Fifty neighbours file fifty separate cases

One broken road affecting forty households becomes forty grievances, each starting at day one,
each closable separately, none of them evidence of scale.

**Built:** joinder. One case, one office, one clock, and a visible count of households. One
signature per verified mobile — enforced in the database, not in the interface. At the target
count the case escalates automatically to the named next authority.

A stranger with no case number reaches this through `/near-you`, which lists what is already
open near them. Joining is offered before filing, because a case with fifty names moves and
fifty cases with one name each do not.

### 2.4 An officer's report closes the case

This is the mechanism that produces the 95.8%. The officer writes an Action Taken Report, the
case is marked disposed, and the citizen is never asked.

**Built, and it is the centre of the product:** an officer's report **cannot** close a case. It
moves the case to *awaiting your confirmation* and no further. Only a citizen's confirmation
against a verified mobile can close it.

- **Fixed** → closed, recording who confirmed and when
- **Not fixed** → reopens the same case number, history intact, clock resumes, recurrence counted
- **Partly** → stays open

A public case needs more than one confirmation, because a case many people signed cannot be
closed by one of them.

The interface shows the officer's own words — *"the instant representation is accordingly
treated as disposed of at this end"* — then Smiti's plain-language reading of it, then the line
that is the whole argument:

> Their report says **disposed of**. This case still says **open**. On the current portal that
> report would have closed it. Here only you can.

The word *Disposed* is never a status in this product. It appears only in three places, all
deliberate: inside an officer's quoted report, in the sentence above that names the problem, and
in the code that finds it. Checked, not assumed.

---

## 3. Smiti Didi

A named intake worker rather than a form. She asks one question at a time, in whatever language
you write or speak, and never asks which department. Her rules are enforced in code, not
requested in a prompt:

- **Never asks for a full account number, card number, Aadhaar or PAN.** A grievance portal has
  no business holding them, and asking teaches citizens a habit that gets them defrauded.
- **Never asks which office.** Two exceptions, both because the answer is genuinely unknowable
  otherwise: which bank, and which department has gone silent.
- **Answers in the language and script she was addressed in.**
- **Breaks out to a helpline** on any sign of emergency or self-harm — 112, 108, 14416, 101 —
  rather than continuing to take a grievance.

"Ask about this case" is answered **only** from that case's record. Grounding is enforced twice,
and the second time is in code: the answer is checked back against the record and dropped
entirely if it contains a year, a date, a rupee figure or a day count the record does not have.
Prompts are *asked* not to hallucinate. Code is what stops it.

A refusal reads as a refusal. *"The record does not hold the name of the Junior Engineer or a
date for their visit."* A grievance portal that invents a date is worse than one that admits it
does not know.

---

## 4. What is real and what is simulated

Stated plainly, because a demo that blurs this is not worth reading.

| Real | Simulated |
|:--|:--|
| Constitutional and statutory routing for 15 domains | Filing into government channels — no live system is touched |
| 12 statutory remedies with provisions, gates and scope | Officer replies (a clearly-labelled demo control triggers one) |
| Classification, routing and plain-language rewriting by model | The 26-case demo history — every case, date, name and count invented |
| The closure gate, joinder and dedup, enforced in the database | OTP, which is a fixed demo code shown on screen |
| The March 2026 CPGRAMS figures, sourced | |
| Speech in and out, via Sarvam AI | |

Every seeded row is flagged in the database, so the product can tell which is which. Every case
card carries the disclosure.

---

## 5. How it is built

Node 22 · Express · SQLite · OpenAI `gpt-4o-mini` · Sarvam AI (Bulbul v3 TTS, Saaras v3 STT).
No framework, no build step. **2,389 lines of server, 5,462 of front end.**

Four pages, clean URLs, no `.html` anywhere: `/` · `/report` · `/my-cases` · `/near-you`.

### The guardrails are code

Sixteen functions in `server/guardrails.js`, none of them a prompt instruction: input
sanitisation, PII redaction, emergency detection, output validation, a hard spend ceiling, rate
limiting, and an LRU cache. The model cannot spend past the ceiling because the function that
would spend refuses first.

### Cost

A **full demonstration run** — intake, classification, routing, an officer's report rewritten in
plain language, and a grounded question about a case — costs about **$0.001**. Measured, not
estimated. The ceiling is **$4.80** and has never been approached; speech, when exercised, spent **₹0.52** against a ₹90 ceiling.

Two things get it there. The intake was reduced from four model calls to one merged call. And
Smiti says the same forty-odd lines to everyone, so they are cached — the intake suite runs at a
30% cache hit rate on first contact and higher in use.

*The spend counter resets with the process, so this is per-run rather than a lifetime total.*

This matters beyond thrift. A national grievance system runs at a scale where per-grievance cost
decides whether it can exist.

### Design

The visual language is the Indian register, not a monument: the *bahi-khata*, ruled cells, the
serial number in the margin in madder red, the *danda* (।) as separator. Ornament is
pierced-screen and rangoli geometry — a kolam generated from a pulli dot grid that draws itself
on load. Palette is the dye chest: madder, leaf, turmeric, indigo.

No tricolour and no state emblem anywhere. An independent prototype must not dress as a
government product.

Four dye colours, no photographs in the chrome, a few kilobytes of geometry — because the claim
is that this works on the connection most of the country actually has.

---

## 6. Testing

Four suites, **50 checks executed**, all passing.

The assertions are written to fail on the things it would be embarrassing to be caught on. The
most important one is a negative: *after the officer files "disposed of", the case must still
not be closed.* If that ever passes silently, the product's central claim is broken.

| Suite | Checks | Asserts |
|:--|--:|:--|
| `try-closure.mjs` | 15 | the closure gate, reopening, public double-confirmation, refusals |
| `try-timeline.mjs` | 17 | the case record, answering an officer, grounded Q&A refusing to invent |
| `try-remedy-scope.mjs` | 5 | the same remedy answered correctly in two different states |
| `verify-seed.mjs` | 13 | the demo data holds every rule the product claims |

---

## 7. Honest limitations

- **Storage on Vercel is per-instance and in memory.** A filed case survives at least 230
  seconds and was gone by 470 in measurement. Seed history is always present. A real deployment
  needs a shared database; `/api/health` states the limitation rather than hiding it.
- **Interface language is English.** A language selector was built and removed: nine tagged
  strings on a page of two hundred meant switching produced a page that was still overwhelmingly
  English, which is worse than not offering the switch. Smiti still reads and answers in the
  citizen's language — that comes from the model, not from a strings table.
- **One remedy of twelve is documented but not implemented**, and says so.
- **Geolocation reports coordinates, not a ward.** Turning a lat/long into "Rajnagar Ward 4"
  needs a reverse-geocoder this prototype does not have, so it shows the coordinates it actually
  received and says the text field is what filters.
- **No real government integration.** Filing is simulated, and the disclosure is on every case.

---

## 8. What would have to happen next

1. A shared database and a persistent host, replacing per-instance memory.
2. Real channel integration — CPGRAMS, RailMadad, INGRAM, the discom and RBI portals — so
   filing stops being simulated.
3. Officer-side authentication, so an Action Taken Report comes from an identified officer.
4. The remaining Eighth Schedule languages across the interface, done properly rather than
   partially.
5. Independent audit of the routing table against state legislation, state by state.

---

## 9. The claim

This is not a better form. The argument is that the grievance a citizen files is the wrong unit
of measurement, and that the state's own 95.8% is evidence of it rather than evidence against.

A case is not closed when an officer says so. It is closed when the person who reported it says
the thing is fixed.

Everything else here — the routing, the remedies, the joinder, Smiti — exists to get a citizen
to the point where that sentence can be true.

---

*Built for **Build What Moves India**, August 2026. Independent prototype; not affiliated with
the Government of India or DARPG. Ornament credits and licences in `CREDITS.md`.*
