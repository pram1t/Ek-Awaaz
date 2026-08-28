# Two-minute video — script and shot list

**Rule from the brief:** *"One video, no longer than two minutes. Use the first minute to demo the
project as a citizen and the second minute to explain how you built it and why you made those
choices. Both teammates may present."*

The current cut is **2:16 and entirely demo**. Length is a hard fail; the missing second minute
costs marks on *Product thinking* and *End-to-end thinking*, and it is the only place the Codex
requirement can be evidenced.

Narration below is written at ~150 words per minute, which is a comfortable pace with room to
breathe. **Minute one: 155 words (62s). Minute two: 156 words (62s). Total 124s of speech — the gap to
120s is why the shot list has no dead air in it, and why you record the halves separately.**

---

## Minute one — the citizen (0:00–1:00)

Shivangi narrates. Do not open on our interface; open on the problem.

| Time | On screen | Narration |
|:--|:--|:--|
| 0:00–0:08 | pgportal.gov.in, scrolling the list of 92 organisations | "To report a broken village road, you first choose your problem's owner from ninety-two organisations. Then a category. Then a sub-category." |
| 0:08–0:14 | still on the portal | "A pothole is not on that list. It never was — local government is a State subject, so no central ministry can fix it." |
| 0:14–0:22 | Ek Awaaz home → press the mic → **speak in Hindi or Odia** | "Ek Awaaz never asks which office. She just says what happened, in her own language." |
| 0:22–0:32 | transcript appears in her script; Smiti asks a follow-up **aloud**, same language | "Smiti Didi hears which language it is from the audio, asks two or three questions, and answers out loud in the same one. Eleven Indian languages." |
| 0:32–0:42 | routing panel: office + reason | "Before anything is sent: this goes to the Block Development Officer, not Delhi, because a village road is Panchayat work." |
| 0:42–0:50 | remedy card | "And it names what she is already owed by law, with the deadline — before she files." |
| 0:50–0:57 | the 34-households match → tap to join | "Thirty-four households have already reported this road. She adds her name instead of filing the thirty-fifth case. At fifty it goes to the District Collector automatically." |
| 0:57–1:04 | officer's ATR → *awaiting your confirmation* → tap "not fixed" | "Weeks later the officer files 'disposed'. The case does not close. Only she can close it — and she says it is not fixed." |

**Minute-one narration, to read straight through:**

> To report a broken village road, you first choose from ninety-two organisations. Then a category.
> Then a sub-category. A pothole is not on that list — it never was. Local government is a State
> subject, so no central ministry can fix it.
>
> Ek Awaaz never asks which office. She says what happened, in her own language. Smiti Didi hears
> which language from the audio, asks two or three questions, and answers aloud in the same one.
>
> Before anything is sent: this goes to the Block Development Officer, not Delhi, because a village
> road is Panchayat work. And it names what she is already owed by law, with the deadline.
>
> Thirty-four households have reported this road. She adds her name instead of filing the
> thirty-fifth case. At fifty it reaches the District Collector automatically.
>
> The officer files "disposed". The case does not close. Only she can close it — and she says it is
> not fixed.

---

## Minute two — how we built it (1:00–2:00)

Pramit narrates. Screen: the repo, the routing table, a guardrail function, the test output.

| Time | On screen | Narration |
|:--|:--|:--|
| 1:00–1:10 | Codex in the editor, commit history scrolling | "We built this with Codex — the backend, and most of the frontend. Smiti runs on the OpenAI API: she reads the grievance, chooses the next question, and puts the officer's reply into plain words." |
| 1:10–1:22 | `routing.json` and `remedies.json` open | "The two things that matter are data, not prompts. The constitutional tiers are a routing table. Twelve statutory remedies are a second table, gated by deadline and by state — so the same pothole question gets a different, correct answer in Bihar and in Maharashtra." |
| 1:22–1:36 | `guardrails.js`, then the banned-ask filter | "Codex also found the bugs. A prompt is a request; code is a guarantee. Every rule the model must obey is enforced in code, because the model broke each one when we only asked: never request an Aadhaar or account number, never invent a date, never answer in a language you did not use." |
| 1:36–1:46 | the DB schema; the closure test passing | "The closure gate is a database constraint, not a screen. An officer's report cannot reach 'fixed' — only a citizen's verified confirmation can. Our test suite asserts that a case stays open after an officer says it is closed." |
| 1:46–1:54 | health endpoint / cost figure | "A full walkthrough costs about a tenth of a paisa, because four model calls were merged into one and her fixed lines are cached. That is what makes national scale arguable." |
| 1:54–2:00 | the real-versus-mocked table on the site | "Filing into government systems is simulated, and every case on the site says so." |

**Minute-two narration, to read straight through:**

> We built this with Codex — the backend and most of the frontend. Smiti runs on the OpenAI API: she
> reads the grievance, chooses the next question, and puts the officer's reply into plain words.
>
> The two things that matter are data, not prompts. The constitutional tiers are a routing table.
> Twelve statutory remedies are a second table, gated by deadline and state — so the same pothole
> question gets a different, correct answer in Bihar and Maharashtra.
>
> A prompt is a request; code is a guarantee. Every rule the model must obey is enforced in code,
> because it broke each one when we only asked: never request an Aadhaar number, never invent a
> date, never answer in a language you did not use.
>
> The closure gate is a database constraint. An officer's report cannot reach "fixed" — only a
> citizen's confirmation can, and our tests assert it.
>
> Filing is simulated, and every case says so.

---

## What changed from the current cut, and why

| Current | New | Reason |
|:--|:--|:--|
| 2:16 | under 2:00 | hard rule in the brief |
| all demo | 60s demo + 60s build | the brief prescribes the split; it is the only place Codex is evidenced |
| opens on our homepage | opens on the 92-organisation list | *Problem* is a judged criterion, and the problem is more persuasive than the solution |
| grievance is typed | grievance is **spoken**, in an Indian language, and she replies **aloud** | voice-first is the accessibility claim; typing it hides the whole feature |
| closure gate absent | closure gate is the last demo beat | it is the one mechanism no other entry will have |
| remedy explained abstractly at the end | remedy shown on screen before filing | it is a screen, not a concept |

## Recording notes

- Say **"Ek Awaaz"** and **"CPGRAMS"** slowly and once each, early. A transcription of the current
  cut heard "A-Covers", "ACAWAS" and "CP grounds" — if a machine cannot catch the product name, a
  tired reviewer may not either.
- The mic demo must use a real Indian language, not English. That is the whole point of the feature.
- Keep the cursor still while narrating a panel. Movement pulls the eye away from the sentence.
- Record the two minutes as two takes and cut them together; a single 2-minute take will drift long.
