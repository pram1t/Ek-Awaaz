---
title: "CPGRAMS, and what we changed"
subtitle: "Nine documented failures, and the mechanism built against each one"
author: "Ek Awaaz · Shivangi Nayak & Pramit Panda"
date: "27 August 2026"
lang: en-IN
---

**Portal under review:** pgportal.gov.in — CPGRAMS 7.0 (footer read 21 August 2026)
**Live build:** ek-awaaz.vercel.app · **Code:** github.com/pram1t/Ek-Awaaz

Every **Before** below is a published figure or a documented rule, with its source named. Every
**After** is a mechanism running on the live link. Where something is designed but not built, it
says so. Section 10 is what we did *not* solve.

---

# 0. The scale, stated first

| Figure | Value | Period |
|:--|--:|:--|
| Grievances "resolved" | ~70 million | 2022–2024 |
| Citizen satisfaction | barely above 50% | same |
| Received, central ministries | 1,89,189 | March 2026 |
| Disposed | 1,81,279 (95.8%) | March 2026 |
| Pending at month end | 81,187 | March 2026 |
| Average disposal time | 13 days | 2026 |
| Monthly disposals | 1.25–1.44 lakh | recent |
| Recurring grievances DARPG itself analysed | 5 lakh+ | across four years |
| Ministry of Labour & Employment | 27,979 | April 2026 — highest |
| Financial Services (Banking) | 24,759 | April 2026 |
| Petroleum & Natural Gas | 14,038 | April 2026 |
| EPFO share of all Labour grievances | 29.3% | Jan–Jun 2025 |

> **The sentence that starts everything:** seventy million grievances closed, and satisfaction
> barely over half. DARPG's own study of five lakh recurring grievances found that fast closure
> does not mean the citizen got relief.

The disposal rate is not a lie. It measures the wrong thing — a file being closed, not a road being
repaired — and nothing in the number records whether the person who complained agrees.

---

# 1. Reach — the pothole has no home

**Before.** CPGRAMS routes to **92 central organisations** and **36 state/UT portals** that are
API-integrated. It cannot reach a Gram Panchayat or a municipal body at all.

- Local government is **Entry 5 of the State List**, Seventh Schedule. Parliament cannot legislate
  on it, so DARPG has no authority to direct a Municipal Corporation to do anything.
- The **73rd and 74th Amendments** pushed roads further down: Article 243G with the Eleventh
  Schedule gives Panchayats roads and culverts; Article 243W with the Twelfth gives Municipalities
  roads and bridges.
- Those Articles say a State legislature *may, by law, endow* local bodies with these functions.
  Devolution is enabling, not mandatory — a Panchayat can hold the subject on paper with no funds
  and no engineers.
- **No standard Panchayat API exists anywhere in India.**

So a pothole is not a badly-named category on CPGRAMS. **It was never a category at all** — which
is the worse problem, because the citizen has no way to learn which portal is theirs. A collapsed
anganwadi roof, a dry handpump, a dark street: none of them has a front door here. And the portal's
own worst-documented failure is the **centralisation paradox** — a local issue forwarded up to a
ministry and back down through every layer, arriving diluted and late.

**After.** Routing across **five constitutional tiers**, each with a real office and the provision
that makes them answerable:

| Tier | Where it goes |
|:--|:--|
| Panchayat | Block Development Officer |
| Central scheme | State Quality Coordinator, NRIDA (PMGSY) |
| Municipal | Municipal Commissioner |
| State | Executive Engineer, State PWD |
| Union | Project Director, NHAI |

The citizen never picks. From what they said plus where they are, the tier is inferred and the
reasoning is shown in one sentence: *"This goes to the Block Development Officer, Rajnagar block.
A village road is the Panchayat's job, so this does not go to Delhi."*

Fifteen problem types are mapped this way. Where no digital route exists, it says so and hands over
the working alternative rather than faking an integration.

> **Pull quote:** A pothole complaint routed perfectly to the right ministry still dies, because the
> Union cannot fix a Panchayat road.

---

# 2. Intake — a taxonomy written for officers

**Before.** Nine steps, and the second one is the wall.

1. Mandatory registration: name, gender, address, country, state, district, pincode, mobile, email,
   captcha, mobile OTP. No anonymous filing. Grievances sent by email are explicitly ignored.
2. **Pick your organisation from a flat alphabetical list of 92** — real entries include
   *Central Board of Direct Taxes (Income Tax)*, *Promotion of Industry and Internal Trade*,
   *Investment & Public Asset Management*, *Water Resources, River Development & Ganga Rejuvenation*.
   Sorted A–Z, by the government's org chart, not by anything a citizen is experiencing.
3. Category → sub-category cascading dropdowns. CPGRAMS 7.0 made this a questionnaire, ~20 broad
   categories, with *Others / Miscellaneous* as the escape hatch.
4. Free text, 4,000 characters, plus a PDF attachment.
5. Registration ID issued, routed to the mapped Grievance Redressal Officer.
6. 21-day target; 3 days for system-flagged priority. Interim ATR if longer.
7. ATR filed → SMS and email → feedback. A BSNL call centre phones every disposed case.
8. Dissatisfied → appeal within 30 days to a Nodal Appellate Authority of Additional or Joint
   Secretary rank, disposed within 30 days.
9. Excluded outright: RTI matters, sub-judice and court matters, religious matters, government
   servants' own service matters, suggestions, and anything touching territorial integrity.

**The root cause, and it is documented.** The categories are authored by the ministries themselves.
The NIC officer manual has a *Manage Grievance Category* screen where each ministry's nodal officer
adds their own; DARPG's 2024 guidelines require only that they "undertake review of categorization
once in a six months." The guidelines state the purpose plainly: categorisation exists so grievances
reach the right authority "in shortest possible time."

**Citizen comprehension was never the design goal.** The taxonomy reads like file-noting because it
*is* file-noting.

**After.** One question: *what happened?* Then two to three follow-ups, each chosen from what has
already been said. No organisation list, no category tree, no sub-category.

- The **stop is in code**, not asked of the model: three answers, or twice "I don't know", or
  what-and-when on record.
- Say "I don't know" and that topic closes permanently — it will not be asked again, and neither
  will anything adjacent to it.
- Clicking a topic card carries the topic into the conversation, so nobody classifies twice.
- The location question is shaped by the problem: a village and block for a road, a branch and city
  for a bank, a train or station for a railway case. Asking a stuck provident-fund claimant for
  their block is the same failure as asking them to pick a ministry.
- The review screen is a **summary of the conversation** in named fields, not a transcript pasted
  into boxes. Nothing is filed until the record is complete enough for an office to act on it —
  which is what DARPG's own closure category *"closed due to insufficient information"* exists
  because of.

> **Pull quote:** The categories are written by ministries, for routing to officers. Citizen
> comprehension was never the objective. So we deleted the question.

---

# 3. Language and literacy — where a villager actually goes

**Before.** CPGRAMS is a web-and-central system in 22 scheduled languages with auto-translated
replies. The rural citizen's real paths are none of them:

- **Common Service Centres** — about 5 lakh CSCs across more than 2.56 lakh Gram Panchayats. The
  CPGRAMS FAQ permits filing through one, and in practice a Village Level Entrepreneur fills the
  form on the citizen's behalf, **for a fee**. pgportal's own homepage carries a warning that money
  is being extracted from the public even though filing is free.
- **State CM helplines, which are voice-first** — MP's 181 runs 14 regional call centres where an
  agent captures the complaint orally and transcribes it; UP's 1076 does the same 24×7; AP's
  Spandana adds in-person Monday darbars. These are the most accessible grievance channels in India
  for a non-literate citizen, and they are state-level, not central.
- **Meri Sadak** (NRIDA) for rural roads, with a geotagged photo and a 10-day reopen window.
- **Physical post** — a plain sheet of paper or a postcard, no format.

And translation is not comprehension. A Santhali speaker receives machine-translated file-noting.

**After.** Voice as the primary input, not an add-on.

- Speak; when you stop, it sends. Silence ends the turn after 1500ms — no button.
- **Eleven Indian languages**, each verified to return real audio in its own script: English, हिन्दी,
  বাংলা, मराठी, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, ગુજરાતી, ਪੰਜਾਬੀ, ଓଡ଼ିଆ.
- **The language is detected from the audio, never chosen from a menu.** Nobody should have to name
  their own language to a machine that can hear it.
- Smiti Didi answers **aloud, in the language you spoke**.
- The officer's reply is shown twice: the officialese verbatim, then a plain-language reading of it.

One implementation note that matters: the browser's own speech recogniser is not used, because it
has no Odia and returns confident English nonsense when handed it — an Odia sentence came back as
*"I'm going to organ body control."* A confident wrong answer is worse than a slow right one.

> **Pull quote:** The most accessible grievance channels in India are phone lines run by states. The
> central portal is a web form. We made the central journey voice-first.

---

# 4. Duplicates — fifty dismissals instead of one case

**Before.** Fifty households on one broken road file fifty cases. Fifty IDs, fifty officers, fifty
templated closures. The system takes fifty units of load; the villagers get fifty individual
dismissals; and nobody's complaint carries the weight of the other forty-nine.

DARPG's 2024 guidelines had to create a **spam box**, **auto-closure for frivolous cases**,
**no-ATR paths** for suggestions and scheme-demands, and **blocking of habitual complainants** —
because volume, not classification, is what breaks quality. That is the government recording the
problem in its own rulebook.

**After.** Joinder. The second person reporting the same issue in the same place does not create a
case; they sign the existing one.

- One case, many names. **One Action Taken Report instead of fifty.**
- **One signature per verified mobile**, enforced by a database constraint — one aggrieved family
  cannot outrank fifty households.
- Names are counted publicly; identities are never shown to other signatories.
- At the threshold the case escalates automatically to the named next authority — the citizen does
  not need to know that appealing is a thing.
- **Two taps to join**, as of this build. It previously asked three required questions and an
  evidence screen, which is the same friction as filing fresh and destroys the reason to join.
- `/near-you` lists every open public case, filterable by state and ward — the only route into
  joinder for someone with no case number. Joining is offered **before** filing.

This is the only mechanism here that gives government less work and citizens more power at the same
time.

> **Pull quote:** Fifty neighbours, one road. Today that is fifty cases and fifty dismissals. Here it
> is one case with fifty names and one report — so more citizens filing means less officer work.

---

# 5. Day 22 — the remedy nobody mentions

**Before.** The 21-day target, the 3-day priority target, the 30-day appeal window and the whole
nodal-officer architecture come from **DARPG's Office Memorandum of 23 August 2024 — not from law.**

CPGRAMS rests on no statute at all. The Right of Citizens for Time Bound Delivery of Goods and
Services and Redressal of their Grievances Bill, 2011 would have created a statutory right,
redressal in 30 working days, and Central and State Grievance Redressal Commissions. It **lapsed
with the dissolution of the 15th Lok Sabha in 2014** and was shelved.

So: no statutory right, no penalty, no independent commission — and an appeal is heard by **the
officer next senior to the one complained about, in the same hierarchy.** The system audits itself.

When the ATR says "disposed" and nothing has changed, the citizen has nothing left.

**Except they do, and nobody tells them.** For almost every high-volume grievance in India there is
already a statutory or regulatory remedy with a binding deadline, an independent decider, and often
money attached:

| What the citizen says | The stronger remedy they already hold | Teeth |
|:--|:--|:--|
| Bank debited me wrongly | RBI Integrated Ombudsman Scheme 2021, after the bank has had 30 days | Up to ₹20 lakh, plus ₹1 lakh for time and harassment |
| My refund hasn't come | Interest under Section 244A — statutory, not discretionary | 0.5% per month |
| They refused my ration | NFSA 2013 s.15 District Grievance Redressal Officer; appeal to the State Food Commission under s.16 | A DGRO in every district |
| PF claim stuck | Regional → Central PF Commissioner → EPF Ombudsman | Statutory appeal under s.7I |
| No power for days | Consumer Grievance Redressal Forum under s.42(5), Electricity Act 2003, then the Ombudsman under s.42(6) | Forum decides in 3 months |
| MGNREGA wages unpaid | District Ombudsperson | 25% of minimum wage for 30 days, half-wage after |
| Builder hasn't handed over | RERA Authority and its Adjudicating Officer | Compensation, interest, penalty; 60 days |
| A pothole injured me | Public-law compensation — Bombay HC, 14 October 2025, Article 21 | ₹6 lakh for a death; ₹50,000–₹2.5 lakh for injury |

CPGRAMS quietly substitutes a non-statutory 21-day request for a legal right. Filing here instead is
a downgrade nobody warned them about.

**After.** **Twelve remedies mapped, eleven live**, each named *before* the case is filed, with its
forum, its teeth, its clock and its provision.

And each one is **gated and scope-checked**, because a remedy that does not apply to you is worse
than none:

- The Bombay High Court's pothole compensation scale is Maharashtra law. A Bihar case is told *"not
  settled law in Bihar, and the amounts are not fixed in this state."* A Maharashtra case is told
  *"applies only if the road caused an injury."* **Same question, two states, two correct answers.**
- The RBI Ombudsman is only available once the bank has had 30 days, so a 12-day-old complaint is
  told the date it becomes available rather than being sent somewhere it will be refused.

Where the ordinary grievance genuinely *is* the right route — Railways, where CPGRAMS is the correct
escalation above RailMadad — it says so and files there without ceremony. The value is in knowing
the difference.

> **Pull quote:** Your bank has had 30 days. That means the RBI Ombudsman can hear this and can award
> up to ₹20 lakh. Nobody tells you that exists.

---

# 6. Who closes a case

**Before.** Filing an Action Taken Report closes the grievance. "Disposed" is the terminal state,
and it is the officer's word. Templated closures — *"matter forwarded to concerned department"* —
count as resolved. Recurrence is spotted **retroactively**, in monthly reports and dashboards, and
never used to escalate a live case. A BSNL call centre phones disposed cases for feedback, after the
file is already shut.

**After.** The inversion, and it is the single most distinctive thing in the build.

- An officer's report moves a case to **"awaiting your confirmation"** and no further.
- **Only the citizen marks a case fixed.**
- Answering *"not fixed"* reopens **the same case number**, with its history intact, the clock
  running again, and the recurrence count up by one.
- The word **"disposed" appears nowhere** in Ek Awaaz. A case is open, escalated, awaiting your
  confirmation, partly fixed, reopened, or confirmed fixed.
- You can **write back to an officer**. It lands on the record, and if the case was waiting on you it
  returns to their desk — because answering an officer is not agreeing with them.
- The clock is honest. At 21 days it does not stop; it says **by how much** it has been breached:
  *"117 days past the 21-day limit."*

This is enforced in the database, not the interface: `confirmed_fixed` is reachable only through the
confirm endpoint, which requires a verified mobile. The test suite asserts the **negative** — after
an officer files "disposed of", the case must **still not be closed**.

> **Pull quote:** Disposed means a file was closed, not that a road was repaired. Here, only the
> person who reported it can say it is fixed — and that is a database constraint, not a screen.

---

# 7. Honest status, and the hidden trapdoor

**Before.** Two things the citizen is never told.

- **Bribery leaves the workflow.** Corruption and vigilance complaints are handled under CVC and
  DoPT procedure: **no Action Taken Report is filed and the feedback loop is disabled**, closed with
  an interim reply. From the citizen's side, the complaint simply goes silent forever. They are not
  told this is the rule.
- **Exclusions are buried.** RTI, sub-judice matters, religious matters, service matters and
  suggestions are out of scope, which you discover by agreeing to a wall of text.

**After.** Every state names what actually happened, including the unflattering ones.

- The vigilance track is stated up front: *"Bribery complaints go to the Vigilance Officer under CVC
  rules. You will get one acknowledgement and then no updates. That is the rule, not neglect by an
  officer."*
- Where a grievance is the wrong instrument, it routes you to the right one: an RTI that has gone
  unanswered is a **first appeal under section 19**, not a fresh grievance.
- Where no digital route exists, it says so and gives the working alternative.
- **Emergency break-out** before a grievance flow can continue: 112, 108, 14416, 1098, 181, 101.
  A grievance queue is the wrong place for an emergency.
- Ask a question about your own case and it answers **only from that case's record**, and admits when
  the record is silent: *"The record does not hold the name of the Junior Engineer or a date for
  their visit."* A portal that invents a date is worse than one that says it does not know.
- Every KPI on the site prints its own provenance — *published*, *policy*, or *in this build*. Two
  tiles were **deleted** during the build because their numbers had no source.

> **Pull quote:** A bribery complaint on CPGRAMS goes silent forever, and nobody tells you that is
> the rule rather than neglect. We tell you before you file.

---

# 8. Identity and being asked twice

**Before.** Mandatory registration with eleven fields before you can say anything. No anonymous
filing. Email submissions ignored.

**After.** A mobile number and a one-time code, **at the end** — after you have seen where the case
is going. Nothing reaches the server before that.

- **No Aadhaar mandate**, and the reason is legal, not aesthetic: under the Aadhaar Act as amended
  in 2019, no individual may be compelled to authenticate unless a law made by Parliament requires
  it, and there is no such law for grievance filing. The practical reason is worse — Aadhaar OTP
  needs an Aadhaar-*linked* mobile, which is exactly what the rural elderly and many women lack.
  Mandating it raises the barrier in the name of lowering it.
- A **My information** panel assembled from grievances already filed, where every line names the
  case it came from. *"You were never asked for any of this."*
- Smiti will **never ask for a full account, card, Aadhaar or PAN number**. A question that tries is
  regenerated, not dropped — a refusal must not end someone's intake.

> **Pull quote:** Eleven fields before you can speak, on a portal whose most excluded users are the
> ones with the most grievances. We ask for a phone number, at the end.

---

# 9. The build

**Codex** wrote the backend and much of the frontend. **Smiti Didi runs on the OpenAI API** — she
reads the grievance, chooses the next question, summarises the conversation into a case file, and
puts an officer's reply into plain words. Speech is Sarvam (Bulbul v3 and Saaras v3) with OpenAI as
the fallback, both keys server-side so the browser never sees a credential.

Behind her: **Node and Express over SQLite**, 24 endpoints, the constitutional tiers as a routing
table, a remedies table gated by deadline and by state, joinder enforced by a unique constraint on
verified mobiles, and a 26-case seeded history with 13 integrity checks.

**The rule the whole thing rests on: a prompt is a request, code is a guarantee.** Six rules the
model must obey are enforced in code, because each was broken by a model that had been politely
asked not to:

| Rule | Enforced by |
|:--|:--|
| Never ask for an account, card, Aadhaar or PAN number | a pattern filter every generated question passes |
| Never answer in a language the citizen did not use | script comparison — romanised Hindi detected by function words, because it is Latin script and an alphabet test cannot see it |
| Never invent a date, an amount or an office | the answer is checked against the case record and dropped entirely if it carries a figure the record lacks |
| Stop asking when there is enough | counting, done in code — not a job for a model answering each turn in isolation |
| Never ask the same thing twice | similarity check |
| Never exceed the budget | a hard ceiling; the function refuses before the model is called |

**Cost, measured not estimated:** a full walkthrough — intake, three conversational turns, the
summary, the routing sentence, an officer's report rewritten in plain language, and a grounded
question — cost **$0.000712 across 5 calls**, against a $4.80 ceiling never approached. Two things
get it there: four model calls merged into one, and Smiti's forty-odd fixed lines are cached.

**Eight test suites**, including one that asserts a case cannot be closed by an officer's report,
and one that checks all eleven languages return real MP3 audio in their own script.

---

# 10. What we did not solve

- **No real government integration.** Filing is simulated, and every case on the site says so.
- **The interface language is English.** A selector was built and removed: nine tagged strings on a
  page of two hundred meant switching produced a page still overwhelmingly English, which is worse
  than not offering it. Smiti reads and answers in the citizen's language — that comes from the
  model, not a strings table — but the chrome around her does not.
- **Storage is per-instance.** Seeded history is always present; a case you file survives while the
  instance stays warm. Durable needs a persistent process or an external database.
- **One remedy of twelve is documented but not implemented**, and is labelled that way.
- **Geolocation reports coordinates, not a ward.** Turning a lat/long into "Rajnagar Ward 4" needs a
  reverse-geocoder this prototype does not have, so it shows what it actually received.
- **No officer side.** An Action Taken Report here comes from a clearly-labelled demo control.
- **Escalation has no legal teeth** outside states with a right-to-service or grievance-redressal
  Act. A pilot belongs in **Bihar or Rajasthan**, where breaching the clock has a statutory
  consequence. Everywhere else escalation is persuasion, and we say so.
- **Capacity is the real constraint.** Lowering the barrier without joinder would flood a queue
  nobody can clear. Frictionless intake without matching resolution capacity is how you manufacture
  templated closures at scale — which is why joinder is not a feature here but the safety argument.

---

# 11. What we are positioned against

The government solved intake three months ago, and pretending otherwise would end a pitch in one
sentence.

- **Samadhan Didi** — DARPG with Bhashini, 30 May 2026. An AI voice chatbot: speak in any of the 22
  scheduled languages, the model classifies and files against the correct ministry, explicitly so
  citizens avoid "complex forms or administrative categories."
- **IGMS 2.0** — DARPG with IIT Kanpur. Auto-categorisation, spam and frivolous filtering, priority
  tagging, resolution-time prediction, root-cause dashboards.

So simplified multilingual AI intake is **not** the contribution. What remains unbuilt is the last
mile: **which office is actually answerable, what the citizen is legally owed, how many people are
asking, and who is allowed to say it is over.**

> **The whole pitch, in one paragraph:** Intake was solved in May, by the government itself. Two
> things still are not. A pothole complaint classified perfectly and routed to the right ministry
> still dies, because the Union cannot fix a Panchayat road. And a citizen whose bank has ignored
> them for thirty-four days files a 21-day request when an ombudsman who can award ₹20 lakh was
> available all along. Nobody tells them. That is what we built.

---

*Independent hackathon submission. Not an official government product, and carries no government
endorsement.*
