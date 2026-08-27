---
title: "Ek Awaaz — what we built"
subtitle: "Every change in the build, and what it means for the person using it"
author: "Build log · Build What Moves India"
date: "27 August 2026"
lang: en-IN
---

**Live:** ek-awaaz.vercel.app · **Code:** github.com/pram1t/Ek-Awaaz
**Companion to:** the architecture dossier of 23 August 2026, which was written pre-build
**Status:** Built, deployed, model live in production

---

# How to read this

The dossier of 23 August argued what *should* be built. This says what *is* built, what changed
while building it, and — for every change — the one line that matters: **what the citizen now
experiences that they did not before.**

Everything below is in the repository and running on the live link. Where something is designed
but not built, or built but simulated, it says so in section 9 rather than being left for a
reviewer to discover.

---

# 1. The one-line version

> A citizen says what is wrong in their own words. We work out which office is answerable, tell
> them the stronger legal remedy they already hold, join their case to their neighbours' instead of
> starting another, and then refuse to close it until *they* say it is fixed.

Five journeys are served end to end: a village road, a stuck PF claim, an ignored bank debit, a
ration denial, and a joined public case.

---

# 2. The change that matters most: who closes a case

| | Before | Now |
|:--|:--|:--|
| Who closes it | The officer's report closed it | **Only the citizen** |
| What the officer's report does | Ends the case | Moves it to *awaiting your confirmation* and no further |
| If it was not fixed | Nothing, or a fresh appeal | Answer *not fixed* — the **same case number** reopens with its history, the clock resumes, the recurrence count rises |

**Enforced in the database, not the interface.** `confirmed_fixed` is reachable only through the
confirm endpoint, which requires a verified mobile. Our test suite asserts the *negative* — after
an officer files "disposed of", the case must **still not be closed** — because that is the
assertion that would be embarrassing to have silently break.

**What the citizen experiences:** the sentence *"their report says disposed of, this case still
says open"* on their own screen. Nothing in Ek Awaaz is ever called "disposed".

---

# 3. Changes to what the citizen actually does

## 3.1 Intake: a form became a conversation

Rebuilt this week after it tested badly. It was a wizard with fixed questions; it is now Smiti
Didi, one question at a time, each one chosen by the model from what has already been said.

- Two to four questions, then it stops. **The stop is in code**, not asked of the model — three
  answers, or twice "I don't know", or what-and-when on record.
- Say *"I don't know"* and that topic closes. It will not be asked again, and neither will
  anything adjacent to it.
- **She never asks for an account, card, Aadhaar or PAN number.** A blocked question is
  regenerated, not dropped — a refusal must not end the intake.
- The review screen is a **summary of the conversation**, in named fields — not a transcript
  pasted into boxes.

**What the citizen experiences:** they are never shown a ministry list or a category tree. They
answer two or three questions a person would ask, and see a filled case file they never typed into
a form.

## 3.2 Clicking a category now opens the conversation on that topic

*New today.* Every "Report a road issue" link was an anchor that scrolled down to a text box and
asked "What happened?" — throwing away the one thing the click had established.

All twelve cards now open the chat already knowing the topic:

> **Electricity — I have that.** If it is not the right one, just tell me and I will change it.
> **What is happening with your electricity?** A long outage, a transformer gone, or a bill that is
> wrong. Say which, and since when.

**What the citizen experiences:** they never classify their problem twice. The topic is echoed
back so they can see it was understood, and correct it if the card was wrong.

## 3.3 Joining a case: five screens became one

*Fixed today.* Adding your name to an existing case asked three **required** questions, then an
evidence screen, then a review. That is the same friction as filing fresh, which destroys the
reason to join — and a required field on a voluntary act meant a person could be **blocked from
joining** because they could not think of anything to add about a road they walk every day.

Now: the case, one **optional** line, an optional photo, one button. The case-specific question
became the example inside the optional box, so a person who has that detail is still prompted for
it and a person who does not is not stopped.

**What the citizen experiences:** two taps to join a case instead of six screens.

## 3.4 A public wall, and your own case first

`/near-you` lists every open public case, filterable by state and ward — the only route into
joinder for someone with no case number. Joining is offered **before** filing.

*Fixed today:* a case you had just filed did not appear, for three separate reasons — the list was
ordered by household count so a case with one supporter sorted last and could fall off the limit;
your own filed case was not recognised as yours, so it was offered back to you to join; and
nothing floated it. Your cases now appear first, under **"Your case"**, marked as yours.

**What the citizen experiences:** *"34 households have already reported this. Your name on that
case is worth more than a second case about the same problem. At 50 names it goes to the District
Collector on its own."* One signature per verified mobile, enforced by a database constraint. Your
name is never shown to the other people on the case.

## 3.5 The stronger remedy, before filing

**12 statutory remedies on file, 11 implemented**, each with its forum, its teeth, its clock and
its provision — shown *before* the case is filed.

- A disputed bank debit: the RBI Ombudsman can award up to ₹20 lakh, after the bank has had 30
  days, under RB-IOS 2021.
- A late tax refund: Section 244A entitles you to interest.
- A ration shortfall: NFSA section 15 names a District Grievance Redressal Officer.

Each remedy is **gated and scope-checked**. The Bombay High Court's pothole compensation scale is
Maharashtra law, so a Bihar case is told *"not settled law in Bihar, and the amounts are not fixed
in this state"* while a Maharashtra case is told *"applies only if the road caused an injury."*
Same question, two states, two correct answers.

## 3.6 Following the case afterwards

- **A timeline** derived from the case record — filed, routed and why, households joined, the
  officer's reply, your answer, each confirmation. It cannot disagree with the case because it is a
  view of it.
- **The officer's reply, twice:** the officialese verbatim, then Smiti's plain reading of it.
- **You can write back.** It lands on the record, and if the case was waiting on you it goes back
  to the office — answering an officer is not agreeing with them.
- **Ask a question about your own case.** Answered from that case's record and nothing else, and it
  says so when the record does not hold the answer: *"The record does not hold the name of the
  Junior Engineer or a date for their visit."*
- **An honest clock.** 21 days, and when it expires the case says by how much — *"117 days past the
  21-day limit"* — instead of capping at "Day 21 of 21" and implying the clock still runs.

## 3.7 Nothing is asked twice

A **My information** panel assembled from the grievances already filed, where every line names the
case it came from. *"You were never asked for any of this."*

## 3.8 Plain English across the whole site

*Done today.* The copy was written like a policy note. **39 strings rewritten.**

| Was | Now |
|:--|:--|
| "The route was identified as the Block Development Officer" | "It went to the Block Development Officer… because a village road is his job" |
| "a statutory deadline, an independent adjudicator" | "a deadline the office must meet, someone outside the department who can decide" |
| "which local, state, sectoral, or central office" | "which office can actually fix it" |
| "At 50 local signatures, automatically escalated" | "At 50 names, it goes to the District Collector on its own" |
| "if the 21-day window lapsed" | "If he missed 21 days" |
| "Scheme of the Ministry of Rural Development — no statute" | "A central government scheme, not a law" |

Sentences over 26 words: **14 → 1.** Long words in the homepage copy: **48 → 39.** Total word count
rose slightly — the honest trade with plain English is more words, but smaller ones.

Kept deliberately: **disposed**, **grievance**, and the named offices and schemes. Those are the
government's own words and the argument depends on quoting them accurately.

---

# 4. Voice

Today: press the mic, speak instead of typing, watch a live level meter driven by **real microphone
amplitude** — not a CSS animation — and a live transcript, then use it or edit it first.

Sarvam speech is built and metered on its own rupee ceiling: **Bulbul v3 for speech, Saaras v3 for
listening, 11 Indic locales**, both keys server-side so the browser never sees a credential.
Verified on the live site in Hindi, Tamil, Bengali, Marathi and English — real MP3 back, English
served from cache.

**The honest limit, being fixed next:** voice is currently one-directional. The transcript fills the
box; Smiti answers on screen, not aloud. Full voice-first — speak, and she speaks back — is the
next change.

---

# 5. The design: a corporate portal became an Indian one

Rebuilt as a heritage layer rather than a recolour, after a first attempt that only changed the
tint.

- **Ground and ink:** ivory paper, madder red, indigo, a dye-chest palette instead of government blue.
- **Ornament:** a mandala and a braid used as CSS masks, so one file inherits `currentColor` and
  works on both light and dark grounds. The braid tiles seamlessly at any height — the gaps were
  the SVG letterboxing, not the artwork.
- **The mark:** a microphone, redrawn twice because at 18px the first two versions read as
  something else entirely.
- **Concern cards:** twelve illustrated panels, each naming where it actually goes *and* the
  stronger remedy behind it.
- **Motion:** first-paint reveals, counting numbers, filling bars — with a watchdog so a stalled
  script cannot leave the page blank.

**Five KPIs, each printing its own provenance** on the tile — *published*, *policy*, or *in this
build*. Two earlier tiles were **removed** during this work because their numbers had no source in
the repository.

---

# 6. What is guarded, and where

The distinction the whole build rests on: **a prompt is a request, code is a guarantee.** Every rule
below is enforced in code, because each one was broken by a model that had been politely asked not
to.

| Rule | Enforced by |
|:--|:--|
| Never ask for a full account, card, Aadhaar or PAN number | `askIsBanned` — every generated question passes it, canned or not |
| Never answer in a language the citizen did not use | `switchedLanguage` — romanised Hindi detected by function words, because it is Latin script and an alphabet test cannot see it |
| Never invent a date, an amount or an office | `groundedEnough` — the answer is checked against the case record and dropped entirely if it carries a figure the record lacks |
| Stop asking when there is enough | `enoughKnown` — counting is not a job for a model answering each turn in isolation |
| Never ask the same thing twice | `tooSimilar` |
| Never exceed the budget | A hard ceiling; the function refuses before the model is called |
| Break out on an emergency | 112, 108, 14416, 101, 1098, 181 — detected before a grievance flow can continue |

**16 guardrail functions**, none of them a prompt instruction.

*Found today while testing something else:* an English grievance about a transformer came back with
a follow-up in romanised Hindi. The intake prompt opens with *"RULE ONE, above everything: reply in
the SAME language and the SAME SCRIPT"* — and the model broke it. `switchedLanguage` backed one path
in code but the intake path had only the prompt. It is code now, applied before the result is
cached. **New suite: 13 assertions.**

---

# 7. Reliability, and cost

- **Production was crashing.** `better-sqlite3` aborted the whole Node process on Vercel —
  `RemoveEnvironmentCleanupHook — Assertion failed`, SIGABRT — because a statement's destructor ran
  after the environment was gone. ~130 short-lived prepared statements per cold start became 5.
  Measured after: **zero failures across 24 requests.**
- **The model is now live in production.** The keys were missing, so every conversational
  improvement was invisible on the live site — it ran on hand-written fallbacks. `ai: "live"` now,
  and the conversation suite passes against production.
- **Filed cases stopped vanishing.** Storage was in-memory per instance, which is why the *My
  information* panel came back empty. Now a file on the instance — and the health endpoint states
  exactly what that buys rather than implying durability.
- **Cost, measured not estimated:** a full walkthrough — intake, three conversational turns, the
  summary, the routing sentence, an officer's report rewritten in plain language, and a grounded
  question — **$0.000712 across 5 calls**, against a $4.80 ceiling never approached. Two things get
  it there: four model calls merged into one, and Smiti's forty-odd fixed lines are cached.

**8 test suites.** 24 endpoints, 15 domains, 26 seeded cases with 13 integrity checks.

---

# 8. What a reviewer can click

| Journey | Where |
|:--|:--|
| A village road, routed to a Panchayat and joined by neighbours | Home → *Report a road issue* |
| A bank debit, and the ₹20 lakh remedy nobody mentioned | Home → *Report a banking issue* |
| A stuck PF claim | Home → *Report a PF issue* |
| A ration denial and the NFSA officer | Home → *Report a ration issue* |
| Joining a case with 34 households already on it | `/near-you` |
| The closure gate — an officer says fixed, the citizen says no | `/my-cases` |
| What is real and what is simulated | `/api/health` |

---

# 9. What we have **not** done

Stated because a change log that only lists wins is not a change log.

- **No real government integration.** Filing is simulated. Every case says so.
- **Voice is one-directional today.** She listens; she does not yet speak back. Next change.
- **The interface language is English.** A selector was built and removed: nine tagged strings on a
  page of two hundred meant switching produced a page still overwhelmingly English, which is worse
  than not offering it. Smiti reads and answers in the citizen's language — that comes from the
  model, not a strings table — but the chrome around her does not.
- **Storage is per-instance.** Seeded history is always present; a case you file survives while the
  instance stays warm. Durable needs a persistent process or an external database.
- **One remedy of twelve is documented but not implemented**, and is labelled that way.
- **Geolocation reports coordinates, not a ward.** Turning a lat/long into "Rajnagar Ward 4" needs
  a reverse-geocoder this prototype does not have, so it shows what it actually received.
- **No officer side.** An Action Taken Report here comes from a clearly-labelled demo control, not
  an authenticated officer.

---

# 10. Lines you can say out loud

Pulled out because they are the claims that survive scrutiny.

1. *"Intake was solved in May, by the government itself. This is the part after."*
2. *"CPGRAMS disposed 95.8% of grievances in March. Disposed means a file was closed, not that a
   road was repaired. Nothing in that number records whether the person who complained agrees — and
   nothing asks them."*
3. *"Here, only the citizen can close a case. An officer's report moves it to 'awaiting your
   confirmation' and no further. That is a database constraint, not a design choice."*
4. *"A pothole complaint routed perfectly to the right ministry still dies, because the Union
   cannot fix a Panchayat road. Local government is Entry 5 of the State List."*
5. *"Your bank has had 30 days. That means the RBI Ombudsman can hear this, and can award up to
   ₹20 lakh. Nobody tells you that."*
6. *"Fifty neighbours, one road. Fifty cases each start at day one. One case with fifty names
   moves."*
7. *"The same question in Bihar and in Maharashtra gets two different, correct answers — because
   the case law is Maharashtra's."*
8. *"Every rule about what the AI may not do is in code, not in the prompt. We know, because the
   model broke each one when it was only asked."*
9. *"A full walkthrough costs about a tenth of a paisa."*
10. *"Filing is simulated, and it says so on every case."*

---

*Independent prototype, August 2026. Not affiliated with the Government of India or DARPG.*
