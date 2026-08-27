# CPGRAMS today, and what Ek Awaaz does instead

A plain comparison. Every claim on the Ek Awaaz side is in the code at
**github.com/pram1t/Ek-Awaaz** and running at **ek-awaaz.vercel.app**.

Where a claim about the existing portal is a matter of published policy it is stated as such.
Where it is an observation of how the site behaves, it says that. Nothing here is asserted about
CPGRAMS that a judge cannot check by opening pgportal.gov.in themselves.

---

## The one that matters

| | CPGRAMS | Ek Awaaz |
|:--|:--|:--|
| **Who closes a case** | The officer. An Action Taken Report marks the grievance disposed. | **Only the citizen.** An officer's report moves the case to *awaiting your confirmation* and no further. |
| **What "disposed" means** | The file was closed. | Nothing is called disposed. A case is `open`, `escalated`, `awaiting_confirmation`, `partly_fixed`, `reopened`, or `confirmed_fixed` — and only a citizen's verified confirmation reaches the last one. |
| **If it was not actually fixed** | File an appeal within 30 days — a new process, on top of the old one. | Answer *"not fixed"*. The **same case number** reopens with its history intact, the clock resumes, and the recurrence count goes up. |
| **March 2026 result** | 1,89,189 received, 1,81,279 disposed. A 95.8% rate that records nothing about whether the complainant agrees. | The same figure is on our homepage, as the argument: *disposed means a file was closed, not that a road was repaired.* |

This is enforced in the database, not in the interface. `confirmed_fixed` is reachable only
through `/confirm`, which requires a verified mobile. The test suite asserts the negative — after
an officer files "disposed of", the case must **still not be closed** — because that is the
assertion that would be embarrassing to have silently break.

---

## Getting a grievance in at all

| | CPGRAMS | Ek Awaaz |
|:--|:--|:--|
| **First thing you face** | A ministry or department dropdown, then a category tree. | A question: *what happened?* |
| **If you don't know the department** | You cannot proceed. And for a village road, **no central ministry is the right answer** — it is panchayat work under Article 243G. | You are never asked. 15 problem types are mapped to the specific officer, with the provision that makes them answerable. |
| **Registration** | An account: name, email, mobile, address, captcha. | A mobile number and a one-time code, at the end — after you have seen where the case is going. Nothing reaches the server before that. |
| **The intake itself** | A form. | A conversation. Each turn is a model call that reads what you have said; the question depends on the answers. Two to four questions and it stops. |
| **If you say "I don't know"** | The field stays required. | The topic is closed. Two unknowns in a row and the intake finishes with what it has. |
| **Voice** | Not on the web flow. | Speak instead of typing, in 11 Indic locales, with the transcript shown before it is used. |

---

## Being told what you are actually owed

| | CPGRAMS | Ek Awaaz |
|:--|:--|:--|
| **Stronger remedies** | Not mentioned. A grievance is the only thing on offer. | **12 statutory remedies on file, 11 implemented**, each with its forum, its teeth, its clock and its provision — shown **before** you file. |
| **Example: a disputed bank debit** | File a grievance. | You are told the RBI Ombudsman can award up to ₹20 lakh, that the bank must be given 30 days first, and that this is under the RB-IOS 2021 scheme. |
| **Example: a late tax refund** | File a grievance. | Section 244A entitles you to interest. |
| **Example: a ration shortfall** | File a grievance. | NFSA section 15 names a District Grievance Redressal Officer with a statutory duty. |
| **Whether a remedy applies to you** | — | Gated and scope-checked. The Bombay High Court's pothole compensation scale is Maharashtra law, so a Bihar case is told *"not settled law in Bihar, and the amounts are not fixed in this state"* while a Maharashtra case is told *"applies only if the road caused an injury."* Same question, two states, two correct answers. |

---

## Fifty neighbours, one broken road

| | CPGRAMS | Ek Awaaz |
|:--|:--|:--|
| **Forty households, same road** | Forty grievances. Each starts at day one. Each can be closed separately. None is evidence of scale. | One case. One office. One clock. A visible count of households. |
| **Duplicate detection** | — | Joinder. One signature per verified mobile, enforced in the database. At the target count the case escalates automatically to the named next authority. |
| **Finding what is already open near you** | — | `/near-you` lists every open public case, filterable by state and by ward. Joining is offered **before** filing, because a case with fifty names moves and fifty cases with one name each do not. |
| **Privacy in a shared case** | — | Your name is never shown to other signatories. Only the issue, the office and the count are public. |

---

## Following your own case

| | CPGRAMS | Ek Awaaz |
|:--|:--|:--|
| **Status** | A status word and a date. | A timeline derived from the case record — filed, routed and why, households joined, the officer's reply, your answer, each confirmation. It cannot disagree with the case because it is a view of it. |
| **The officer's reply** | The Action Taken Report, in the register it was written in. | The officialese verbatim, then Smiti's plain-language reading of it, then the line that names the problem: *their report says disposed of, this case still says open.* |
| **Answering an officer** | No mechanism. The exchange is over. | Write back in your own words. It lands on the record, and if the case was waiting on you it **goes back to the office** — answering an officer is not agreeing with them. |
| **Asking a question about your case** | — | Answered from that case's record and nothing else, and it says so when the record does not hold the answer. |
| **The clock** | 21 days, per the DARPG service standard. | The same 21 days, and when it expires the case says **by how much** — *"117 days past the 21-day limit"* — rather than capping at "Day 21 of 21" and implying the clock is still running. |
| **What the system knows about you** | Whatever you re-entered on the registration form. | A *My information* panel assembled from the grievances you already filed, where **every line names the case it came from**. Nothing was asked twice. |

---

## Honesty as a feature

| | CPGRAMS | Ek Awaaz |
|:--|:--|:--|
| **Exclusions** | Buried in a terms gate — service matters, RTI, sub-judice cases and more are out of scope, which you discover by agreeing to a wall of text. | Where a grievance is the wrong instrument, it says so and routes you to the right one instead: an RTI that has gone unanswered is a first appeal under section 19, not a fresh grievance. |
| **What is simulated** | — | Stated on every case and in a table in the submission. Filing into government channels is simulated; the routing, the remedies and the closure gate are not. |
| **When the AI does not know** | — | It says so. *"The record does not hold the name of the Junior Engineer or a date for their visit."* A portal that invents a date is worse than one that admits it cannot answer. |
| **Statistics** | 95.8% disposal, published without what sits behind it. | Five KPIs, each printing its own provenance on the tile — published, policy, or this build. Two earlier tiles were removed during this work because their numbers had no source in the repository. |

---

## What is guarded, and where

The distinction that matters: **a prompt is a request, code is a guarantee.** Every rule below is
enforced in code, because each one was broken by a model that had been politely asked not to.

| Rule | How it is enforced |
|:--|:--|
| Never ask for a full account, card, Aadhaar or PAN number | `askIsBanned` — a pattern filter every generated question passes through, canned or not. A blocked question is regenerated, not dropped. |
| Never answer in a language the citizen did not use | `switchedLanguage` — and romanised Hindi is detected by its function words, because it is Latin script and an alphabet test cannot see it. |
| Never invent a date, an amount or an office | `groundedEnough` — the answer is checked back against the case record and dropped entirely if it contains a figure the record does not have. |
| Stop asking when there is enough | `enoughKnown` — three answers, or twice unknown, or what-and-when on record. Counting is not a job to give a model answering each turn in isolation. |
| Never ask the same thing twice | `tooSimilar` |
| Never exceed the budget | A hard ceiling. The function that would spend refuses before the model is called. |
| Break out on an emergency | 112, 108, 14416, 101, 1098, 181 — detected before a grievance flow can continue. |

16 guardrail functions in `server/guardrails.js`, none of them a prompt instruction.

---

## Cost, which decides whether any of this could exist at national scale

A full walkthrough — intake, three conversational turns, the summary, the routing sentence, an
officer's report rewritten in plain language, and a grounded question — costs about **$0.001**.
Measured, on `gpt-4o-mini`, with a $4.80 ceiling that has never been approached.

Two things get it there: the intake was reduced from four model calls to one merged call, and
Smiti says the same forty-odd lines to everyone, so they are cached.

---

## What we have *not* improved

Stated because a comparison that only lists wins is not a comparison.

- **No real government integration.** Filing is simulated. Every case says so.
- **Interface language is English.** A selector was built and removed: nine tagged strings on a
  page of two hundred meant switching produced a page that was still overwhelmingly English,
  which is worse than not offering it. Smiti reads and answers in the citizen's language, which
  comes from the model rather than a strings table — but the chrome around her does not.
- **Storage on the current host is per-instance and in memory.** Seed history is always present;
  a case you file survives minutes, not days. It needs a persistent process, and `/api/health`
  says so rather than hiding it.
- **One remedy of twelve is documented but not implemented**, and is labelled that way.
- **Geolocation reports coordinates, not a ward.** Turning a lat/long into "Rajnagar Ward 4"
  needs a reverse-geocoder this prototype does not have, so it shows what it actually received
  and says the text field is what filters.
- **No officer side.** An Action Taken Report here comes from a clearly-labelled demo control,
  not from an authenticated officer.

---

## The sentence it all reduces to

CPGRAMS asks the citizen to know which office owns their problem, and then lets that office
decide when the problem is over.

Ek Awaaz works out the office from what the citizen said, tells them what they are owed before
they file, joins their case to their neighbours', and then refuses to close it until the person
who reported it says the thing is actually fixed.

---

*Independent prototype, August 2026. Not affiliated with the Government of India or DARPG.*
