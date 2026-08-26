---
title: "Ek Awaaz"
subtitle: "Route the grievance to the right office — and tell the citizen the stronger remedy they already hold."
author: "Architecture & evidence dossier · Build What Moves India"
date: "Drafted 23 August 2026"
lang: en-IN
---

**Portal under review:** pgportal.gov.in — CPGRAMS 7.0
**Submission deadline:** 28 August 2026, 20:00 IST
**Status:** Pre-build

---

# 1. The problem in one page

India's central grievance portal is not badly designed. It is correctly designed for the wrong half of the problem. Intake was solved three months ago. Nobody has solved where the grievance should go, or what the citizen is actually entitled to when it gets there.

CPGRAMS asks a citizen to choose their grievance's owner from a flat alphabetical list of 92 central organisations — entries like *Central Board of Direct Taxes (Income Tax)*, *Promotion of Industry and Internal Trade*, *Investment & Public Asset Management*. Sorted by the government's org chart, not by anything a citizen is experiencing. Then a category, a sub-category, and a 4,000-character text box.

> **Verified.** 92 organisations in the Central nodal list, read from pgportal.gov.in on 23 August 2026. Portal footer reads Version 7.0, last updated 21 August 2026.

The taxonomy reads like file-noting because it *is* file-noting. In the officer-side application each ministry's nodal officer maintains their own categories through a *Manage Grievance Category* screen, and DARPG's guidelines require only a six-monthly review of them. Their stated purpose is to route a case to the right Grievance Redressal Officer "in shortest possible time." Citizen comprehension was never the objective.

Underneath that sit two harder problems, and they are what this build attacks.

| Problem one — jurisdiction | Problem two — remedy |
|:---------------------------|:---------------------|
| A citizen who navigates the whole form perfectly, and picks exactly the right ministry for a broken village road, still gets nothing — because **no central ministry has the constitutional power to fix that road.** Local government is Entry 5 of the State List. The complaint is forwarded down through the layers CPGRAMS was built to remove, and arrives diluted, late, or closed with a template. | For most high-volume grievances there is a **statutory remedy with a real deadline and often money attached** — and the citizen is never told it exists. CPGRAMS quietly substitutes a non-statutory 21-day request for a legal right. A delayed refund carries interest by law. An unanswered bank complaint reaches an ombudsman who can award ₹20 lakh. Filing on CPGRAMS instead is a downgrade nobody warned them about. |

Ek Awaaz is a front door and a router, not a replacement registry. It files into the systems that already exist, and makes visible the four things those systems hide: **who actually owns this**, **what you are legally entitled to**, **how many of us are asking**, and **what the honest status really is**.

# 2. Where the grievances actually are

Design against the real distribution, not against anecdote. DARPG publishes monthly, and the concentration is striking — a handful of domains carry most of the volume.

| Measure | Figure | Period |
|:--------|-------:|:-------|
| Grievances received, central ministries | 1,89,189 | March 2026 |
| Redressed | 1,81,279 | March 2026 |
| Pendency | 81,187 | March 2026 |
| Average disposal time | 13 days | 2026 |
| Ministry of Labour & Employment | 27,979 | April 2026 — highest |
| Financial Services (Banking Division) | 24,759 | April 2026 |
| Petroleum & Natural Gas | 14,038 | April 2026 |
| EPFO share of all Labour Ministry grievances | 29.3% | Jan–Jun 2025 — largest single category |
| Recurring grievances analysed by DARPG | 5 lakh+ | Across four years |

Those three April 2026 departments alone accounted for around 35% of accounted grievances. Add the Central Board of Direct Taxes and Railways and you have the bulk of the central caseload. The Department of Financial Services topped the list across the first half of 2025, with 5.59 lakh grievances received centrally to late June; the Labour Ministry led filings for 2025 as a whole.

> **What this rules out.** A submission that redesigns the interface for a generic "citizen" is designing for nobody. Every mechanic here has to work for a provident-fund claim, a bank reversal, a tax refund, a ration entitlement and a broken road — because that is where the volume is.

Note also that **the highest-volume domains all already have their own sectoral portal** — EPFiGMS for provident fund, RailMadad and 139 for railways, e-Nivaran for income tax, the RBI's CMS for banks. CPGRAMS sits on top of them as a de facto appeal layer. DARPG's own guidelines admit this: most grievances on CPGRAMS are already appeals against disposals made elsewhere.

# 3. Two Indias, one engine

The failure looks different depending on who is filing, and that difference is the key to a single design serving both.

**The literate city filer.** Provident fund, bank reversal, tax refund, telecom billing, builder delay, passport. This person *can* navigate the form. They file, get a templated reply, and stop — never learning that an EPF Ombudsman, an RBI Ombudsman, a RERA authority with a 60-day clock or statutory interest under Section 244A was available all along. **Their missing thing is knowledge of the stronger remedy.**

**The village filer.** Ration denial, MGNREGA wages unpaid, PM-KISAN instalment missing, road broken, electricity out, land record wrong. This person often cannot reach the form at all, and when the complaint does land, the owning authority is a Panchayat or a district officer that CPGRAMS cannot route to. **Their missing thing is a route at all.**

Same engine, two failure modes. The router that decides *which office* is the same router that decides *which remedy* — both are a lookup from the citizen's plain words into a table the citizen has no way to hold in their head. That is the whole product, and it serves a farmer in Rajnagar and a salaried employee in Pune with one mechanism.

This is also the answer to the obvious objection that a simplified portal only helps the sophisticated. The sophisticated filer is being short-changed too — just further down the funnel, and more quietly.

# 4. The remedy ladder

**The central finding of this dossier.** For nearly every high-volume grievance domain in India, **a statutory or regulatory remedy already exists with a binding deadline, an independent adjudicator, and often compensation**. CPGRAMS offers a non-statutory 21-day request instead, and never mentions the alternative. Millions of citizens each year file the weaker instrument because nobody told them the stronger one existed.

Closing that gap requires no new government infrastructure. It is pure information routing — which makes it buildable in five days and deployable at national scale.

Read the last two columns together. The gap between them is the product.

| What the citizen says | Sectoral channel | The stronger remedy they actually hold | Teeth |
|:----------------------|:-----------------|:---------------------------------------|:------|
| "My PF claim is stuck" | EPFiGMS | Regional PF Commissioner → Central PF Commissioner → appeal to the tribunal (merged into CGIT in 2017). EPF Ombudsman for the region if EPFiGMS fails. | Ombudsman after about a month; statutory appeal under s.7I |
| "The bank debited me wrongly / fraud" | Bank nodal officer | **RBI Integrated Ombudsman Scheme 2021** via cms.rbi.org.in, once the bank has had 30 days. | Award up to ₹20 lakh, plus up to ₹1 lakh for time, expense and harassment |
| "My refund hasn't come" | e-Nivaran, income tax portal | **Interest under Section 244A** is statutory, not discretionary, where the delay is not the taxpayer's fault. | 0.5% per month or part month |
| "They refused my ration" | State PDS helpline | **NFSA 2013**: internal mechanism under s.14, **District Grievance Redressal Officer under s.15**, appeal to the **State Food Commission under s.16**. | Statutory entitlement; a DGRO in every district |
| "My MGNREGA wages never came" | NREGASoft, Gram Panchayat | **District Ombudsperson** with power to enquire and pass awards; delay compensation for wages past 15 days; unemployment allowance where work was not given. | 25% of minimum wage for the first 30 days, half-wage thereafter |
| "No power for days / wrong bill" | DISCOM call centre | **Consumer Grievance Redressal Forum under s.42(5)** of the Electricity Act 2003, then the **Electricity Ombudsman under s.42(6)**. | Forum decides in 3 months; appeal within 30 days; Ombudsman in about 60 days |
| "The builder hasn't handed over" | Builder's own grievance cell | **RERA Authority**, with an Adjudicating Officer empowered to award compensation, interest and penalty; then the Appellate Tribunal. | Authority disposes in 60 days; appeal within 60 days; tribunal in 60 days |
| "Deficient service, any provider" | NCH 1915 / INGRAM | **Consumer Protection Act 2019** — file at the District Commission through e-Daakhil / e-Jagriti. Refund, replacement, compensation for loss and harassment. | District Commission up to ₹50 lakh; State to ₹2 crore |
| "My PM-KISAN instalment is missing" | pmkisan.gov.in grievance | Tiered: portal issues at tier 1, land-seeding and eligibility disputes at tier 2, then automatic escalation to the State Nodal Officer. | 15 working days, then auto-escalation |
| "My train journey / station complaint" | RailMadad and 139, in 12 languages | CPGRAMS is the genuine escalation layer here — one of the few domains where that is the correct next step. | Over 10,000 complaints a day; 139 carries about 58% |
| "Wrong telecom bill / no signal" | Operator complaint centre, then its Appellate Authority | **No ombudsman exists.** TRAI mandates a two-tier operator mechanism; damages are only available at a Consumer Commission. TRAI's 2026 draft regulations propose per-complaint penalties. | 30 days for non-billing complaints; proposed ₹1,000 per complaint, ₹5,000 per appeal, capped ₹50 lakh a quarter |
| "A pothole injured me" | Municipal complaint line | **Public-law compensation** — Bombay HC, 14 October 2025 — from the civic body and contractor jointly, recoverable from named officials. | ₹6 lakh for death; ₹50,000–₹2.5 lakh for injury |
| "Bribe demanded" | CPGRAMS, silently | Vigilance track under CVC and DoPT procedure. **No Action Taken Report is filed and feedback is disabled.** The citizen is never told this. | Real, but invisible — see section 10 |

## What Ek Awaaz does with this table

One sentence at the point of filing, in the citizen's language, before they commit:

> *"You can file this here — but you have a stronger right. Your bank has had 34 days. That means the RBI Ombudsman can hear this, and can award up to ₹20 lakh. Shall we take it there instead?"*

And where the weaker route is genuinely the right one — Railways, for instance — it says so and files there without ceremony. The value is in knowing the difference.

**Why this is safe to build.** Nothing here asks a department to change behaviour, accept a new API, or sign an MoU. It is a lookup table plus honest copy. That is why it can be true on day one and still be true at national scale.

## The honest caveats to state on screen

- Some remedies exist on paper and thinly in practice. As of 2018 only 20 states and one Union Territory had even framed MGNREGA grievance redressal rules, and unemployment allowance is paid in trivial amounts — ₹12,000 and ₹3,000 nationally in 2019-20 and 2020-21.
- Some carry a filing cost or a deposit that CPGRAMS does not — a tribunal appeal is not free in the way a grievance is.
- Naming a remedy is not legal advice, and the product must say so plainly rather than implying representation.

# 5. Why a pothole has no home

The worked example that makes the jurisdiction half of the argument concrete — and the section that makes the product defensible in a room containing government officials. A pothole is unquestionably a grievance. It is missing from CPGRAMS for a constitutional reason, not a design one.

## Roads are divided across four constitutional lists

- **Local government is a State subject.** Entry 5 of the State List, Seventh Schedule, covers local government including municipal corporations and district boards. Parliament cannot legislate on it, so DARPG has no authority to direct a Municipal Corporation to do anything.
- **Roads generally are a State subject.** Entry 13 of the State List covers communications including roads and bridges, other than those in the Union List.
- **National highways are a Union subject.** Entry 23 of the Union List, operationalised through the National Highways Act, 1956 and the NHAI Act, 1988.
- **The 73rd and 74th Amendments (1992)** pushed roads further down. Article 243G with the Eleventh Schedule gives Panchayats "roads, culverts, bridges, ferries, waterways and other means of communication"; Article 243W with the Twelfth Schedule gives Municipalities "roads and bridges" among its eighteen subjects.

> **Critical nuance.** Articles 243G and 243W say the State legislature *may, by law, endow* local bodies with these functions. Devolution is enabling, not mandatory — so a Panchayat can hold the subject on paper with no funds or engineers. Any router must handle a tier that owns the problem but cannot act.

## The judgment that creates a new product

On **14 October 2025**, in *High Court on Its Own Motion v. State of Maharashtra*, a Bombay High Court division bench of Justices Revati Mohite-Dere and Sandesh Patil held that **the right to safe, pothole-free roads is part of the right to life under Article 21**, and fixed public-law compensation: **₹6 lakh for a death**, **₹50,000 to ₹2.5 lakh for injury**, payable by civic bodies and road contractors jointly and recoverable from the erring officers, engineers and contractors personally. It further directed that roads be built to need no repair for five to ten years. The Kerala High Court has held similarly that safe travel is a facet of Article 21, ordering audits and personal accountability for engineers.

So a pothole injury in Maharashtra now carries a **monetary remedy against a named official** — and no portal in India helps a citizen claim it.

## What CPGRAMS is forbidden or unwilling to take

DARPG's guidelines place these outside the ambit of public grievances: RTI matters, sub-judice and court matters, religious matters, government servants' own service matters, suggestions, and anything affecting territorial integrity or friendly foreign relations. Separately, corruption and bribery are pulled out of the ordinary workflow entirely — handled under CVC and DoPT procedure with **no Action Taken Report and the feedback loop disabled**. The citizen is never told. From their side, a bribery complaint simply goes silent forever.

# 6. The accountability vacuum

The deepest structural fact about CPGRAMS is that **it rests on no statute at all.**

The Right of Citizens for Time Bound Delivery of Goods and Services and Redressal of their Grievances Bill, 2011 — the Citizen's Charter Bill — was introduced in the Lok Sabha in December 2011. It would have created a statutory right to time-bound delivery, mandatory citizens' charters within six months, redressal in 30 working days, and Central and State Public Grievance Redressal Commissions. It **lapsed with the dissolution of the 15th Lok Sabha in 2014**, and the plan was subsequently shelved.

So CPGRAMS runs entirely on executive Office Memoranda. The 21-day resolution target, the 3-day priority target, the 30-day appeal window and the whole nodal-officer architecture come from DARPG's OM of 23 August 2024, not from law. No statutory right, no penalty, no independent commission — and appeals are heard by **the officer next senior to the officer complained about, in the same hierarchy**. The system audits itself.

> **Why this matters.** It explains in one line why disposal rates rise while satisfaction sits near half — and it is exactly why section 4's remedy ladder matters. Those remedies have statutes behind them. CPGRAMS does not.

## Where a right does exist: the States

| Law | Year | What it gives the citizen |
|:----|:-----|:--------------------------|
| MP Lok Sewaon Ke Pradan Ki Guarantee Adhiniyam | 2010 | First right-to-service law in India, in force 18 August 2010. |
| Rajasthan Guaranteed Delivery of Public Services Act | 2011 | 108 services across 15 departments; first State to attach a cash penalty — ₹500 to ₹5,000, or ₹250 per day capped at ₹5,000. |
| Karnataka Sakala Services Act | 2011 | Compensation payable to the citizen: ₹20 per day of delay, capped at ₹500, from the designated officer. |
| Delhi Right of Citizen to Time Bound Delivery of Services Act | 2011 | Statutory service timelines for Delhi government services. |
| Bihar Right to Public Grievance Redressal Act | 2015 | In force 5 June 2016. A right to grievance redressal itself: **quasi-judicial powers** for Grievance Redressal Officers, 60 working days, two appeal tiers, 44 departments and 450+ schemes. DARPG has formally studied it. |

Similar laws exist in Punjab, Himachal Pradesh, Kerala, Uttarakhand, Haryana, Uttar Pradesh (Janhit Guarantee), Odisha and Jharkhand.

**Recommendation to state in the video.** Pilot the escalation ladder in a State that already has a statutory right — Bihar or Rajasthan — because there, and only there, breaching the clock has a legal consequence. Everywhere else, escalation is persuasion. Saying this out loud is the most credible thing a hackathon submission can do in front of officials, and it maps onto the brief's honesty criterion.

# 7. Prior art and the gap it leaves

Know this before writing code. Most of what a first-instinct redesign would build already exists — some of it since May 2026.

| Already exists | What it does | Status for us |
|:---------------|:-------------|:--------------|
| **Samadhan Didi** — DARPG + Bhashini, 30 May 2026 | AI voice chatbot. A citizen speaks in any of the 22 scheduled languages; the model classifies, asks follow-ups, and files against the correct ministry and category — explicitly so citizens avoid "complex forms or administrative categories." | Occupies simplified intake |
| **IGMS 2.0** — DARPG + IIT Kanpur, 2024 | AI auto-categorisation, spam and frivolous filtering, priority tagging, resolution-time prediction, root-cause dashboards. | Occupies classification |
| **CPGRAMS 7.0** | Questionnaire category capture, mapping to field offices, automatic escalation, 22 languages, auto-translated replies, appeal workflow. | The system we file into |
| **Sectoral portals** — EPFiGMS, RailMadad, e-Nivaran, RBI CMS, pmkisan, NCH 1915, e-Daakhil | Every high-volume domain has its own front door, and several have a genuine statutory adjudicator behind them. | Our routing destinations |
| **Meri Sadak** — NRIDA, MoRD, since 2015 | Rural road complaints for PMGSY and non-PMGSY roads with geotagged photos, handled by State Quality Coordinators, reopenable within 10 days. | A real routing target |
| **CM helplines** — MP 181, UP 1076, AP Spandana | Phone-first capture. MP runs 14 regional call centres where an agent transcribes an oral complaint into the portal — the most accessible grievance channel in India for a non-literate citizen. | Fallback when no API exists |
| **Common Service Centres** | Around 5 lakh CSCs across more than 2.56 lakh Gram Panchayats; the CPGRAMS FAQ permits filing through them. The real rural path today — a Village Level Entrepreneur files on the citizen's behalf, for a fee. | Channel to legitimise |

## Positioning, stated plainly

If Ek Awaaz is pitched as "simplified multilingual AI intake," an official in the room on 12 September can end the pitch with one sentence. So lead with the opposite claim:

> *"Government already solved intake — Samadhan Didi, May 2026. Intake was never the bottleneck. Two things still are. A pothole complaint classified perfectly and routed to the right ministry still dies, because the Union cannot fix a Panchayat road. And a citizen whose bank has ignored them for 34 days files a 21-day request on CPGRAMS when they could have gone to an ombudsman who can award ₹20 lakh. Nobody tells them. That is what we built."*

## The measured failure we are attacking

- DARPG's own analysis of more than **5 lakh recurring grievances** across four years found that fast closure does not mean the citizen got relief.
- Citizen satisfaction sits **barely above 50%** despite very high disposal rates, and pendency stood at 81,187 cases in March 2026.
- **Recurrence is detected retroactively**, in monthly reports and dashboards — never used to escalate a live case.
- DARPG's guidelines had to create a spam box, auto-closure for frivolous cases, no-ATR paths for suggestions and scheme-demands, and blocking of habitual complainants — because **volume, not classification, is what breaks quality.**

> **Consequence.** Frictionless intake without matching resolution capacity manufactures templated closures at scale. Joinder is the answer — section 11.

# 8. Five mechanics

One citizen journey, five mechanics behind it. The brief warns that **reviewers test the citizen experience, not an admin panel** — so each must be visible on the citizen's screen or it will not be scored.

**Mechanic 1 — Narrative to case file.** The citizen speaks or types freely in their own language. The model asks the two or three follow-ups a Grievance Redressal Officer would have asked, then emits a structured case file: location, asset, issue type, dates, evidence, affected count. Citizen effort falls and officer handling time falls together. This directly kills a real category in DARPG's guidelines — *"Closed due to insufficient information"* — which exists because officers could not reach citizens for missing details.

**Mechanic 2 — Remedy routing.** Before filing, the router checks the section 4 ladder and names the strongest instrument the citizen actually holds, with its deadline and its money. Where the ordinary grievance is the right route, it says so and files. This is the mechanic no other submission will have.

**Mechanic 3 — Jurisdiction inference.** The citizen never picks a ministry. From location plus asset type the router decides the constitutional tier and the actual office, files there, and **shows its reasoning in one sentence**: *"This is a Panchayat road, not a national highway. Sending to the Block Development Officer, Rajnagar — not to Delhi."* Where no digital route exists it says so honestly and hands over the working alternative. Section 9.

**Mechanic 4 — Joinder.** The second person reporting the same issue at the same place does not create a case. They **sign** the existing one. One case, many signatories. Section 11.

**Mechanic 5 — Citizen-confirmed closure.** Today, filing an Action Taken Report closes a case. Invert it: the ATR moves the case to *awaiting your confirmation*, and the citizen closes it. Recurrence within a window reopens the same case with history intact. Meri Sadak already allows reopening within 10 days, so this extends an existing government pattern rather than importing a foreign one.

**Supporting — plain-language outcomes.** CPGRAMS auto-translates replies, but translation is not comprehension: a Santhali speaker receives machine-translated file-noting. The model rewrites the outcome into four plain sentences in the citizen's language — what was decided, what it means for you, what happens next, what to do if this is wrong.

# 9. Jurisdiction routing, worked

One sentence — *"the road to my village is broken"* — resolved across every tier that could own it. This is the general engine shown on a single domain; the same structure holds for land records, water supply, school buildings and street lighting. Put it on screen in the video.

| If the road is… | Owner | Legal basis | Where a grievance actually goes | Route |
|:----------------|:------|:------------|:--------------------------------|:------|
| A national highway | NHAI / MoRTH | Union List Entry 23; National Highways Act 1956; NHAI Act 1988 | MoRTH via CPGRAMS; NHAI's own channels | API exists |
| A State highway or major district road | State PWD | State List Entry 13 | State grievance portal or CM helpline | Varies by State |
| A rural road under PMGSY | NRIDA / State rural works, via State Quality Coordinators | Scheme of MoRD — no statute | Meri Sadak, with geotagged photo and 10-day reopen | Defined channel |
| Any other village road | Gram Panchayat / Block | Art. 243G + Eleventh Schedule — devolution enabling only | Panchayat or BDO in person; CM helpline by phone | **No standard API** |
| A city street | Municipal Corporation or Council | Art. 243W + Twelfth Schedule; State List Entry 5 | The city's own portal or app; CM helpline | City by city |
| Inside a cantonment | Cantonment Board, MoD | Cantonments Act 2006 | Defence via CPGRAMS | API exists |
| The cause of a death or injury | Civic body *and* contractor, jointly | Art. 21; *HC on Its Own Motion v. State of Maharashtra*, Bombay HC, 14 Oct 2025 | Public-law compensation: ₹6 lakh death, ₹50,000–₹2.5 lakh injury, recoverable from named officials | **Nobody offers this** |

> **Read the last two rows together.** The tier with the weakest digital route — the Panchayat — is also the tier now carrying personal liability after October 2025. That asymmetry is the opportunity.

Three honest conclusions to state on screen:

1. For two tiers a clean machine route exists, and Ek Awaaz uses it.
2. For two more a route exists but differs by State or city — so the router degrades to the State portal and discloses that it did.
3. For the Panchayat tier, **no standard API exists anywhere in India.** The honest fallback is the CM helpline, pre-filled and dialable, plus assisted filing in section 12. Saying this beats faking an integration.

DARPG's own 2024 guidelines already state that integration of State and UT portals "through API shall be a priority." Ek Awaaz is not asking for new policy — it builds the citizen side of a policy already announced.

# 10. Lifecycle and honest status

The word **"Disposed"** does not appear anywhere in Ek Awaaz. Every state names what actually happened, including the unflattering ones. This is the honesty criterion scored inside the product rather than in a disclosure slide.

| State | What the citizen is told |
|:------|:-------------------------|
| Received | Case ID, in the language it was filed. *"Recorded in Santhali. Nobody will ask you to repeat this."* |
| Stronger route found | Before filing. *"Your bank has had 34 days. The RBI Ombudsman can hear this and can award up to ₹20 lakh. Take it there instead?"* |
| Routed | Names the office and the reason. *"Panchayat road → Block Development Officer, Rajnagar. Not a highway, so not Delhi."* |
| No route exists | The honest state. *"There is no online system for Panchayat roads. Here is the helpline, pre-filled — or a helper can file it with you, in your name."* |
| Open | Visible clock and visible counter. *"Day 4 of 21. You are the 34th household to report this road. At 50 it escalates to the District Collector automatically."* |
| Officer responded | Interim or final, rewritten into four plain sentences in the citizen's language. |
| Awaiting your confirmation | The closure gate. *"The officer says this is fixed. Is it? Yes / No / Partly."* |
| Fixed | Confirmed by citizens, with how many confirmed and when. |
| Reopened | Recurrence on the same case, history intact. *"Reported fixed in March. Broken again in July. Same case, third time."* |
| Escalated | By signature threshold, clock breach, or third recurrence — automatically, without the citizen needing to know to appeal. |
| Vigilance track | The trapdoor, named. *"Bribery complaints go to the Vigilance Officer under CVC rules. You will get one acknowledgement and then no updates. That is the rule, not neglect."* |
| Outside the system | With the actual reason from a fixed list — RTI, court matter, religious matter, service matter — and where to go instead. |
| Missing information | Names exactly what is missing, and never closes without an attempt to reach the citizen. |

> **Also on screen.** Who hears an appeal, and that they are the officer's own next-senior in the same hierarchy. We cannot fix a self-auditing system in five days; making it visible is itself a reform, and costs one line of copy.

# 11. Joinder and occurrence logic

Fifty villagers with one broken road file fifty separate cases today. Fifty IDs, fifty officers, fifty templated closures. The system experiences fifty units of load; the villagers experience fifty individual dismissals; and no one's complaint carries the weight of the other forty-nine.

**Joinder inverts the economics: more citizens filing means less officer work, not more.** Fifty filings become one case with fifty signatories — one Action Taken Report instead of fifty. This is the only claim in the submission that offers government a workload reduction and citizens more power at the same time.

## Deduplication key

- A spatial cell of roughly 150 m — an H3 or geohash cell — plus issue type, plus asset identifier where one is known: a PMGSY road code, a ward number, a fair-price-shop licence, a DISCOM consumer number.
- A match surfaces as a choice, never an automatic merge: *"34 people have already reported this. Add your name, or file something different."*
- The case text stays the first filer's. Signatories may add a photo and a one-line note; they do not rewrite the grievance.

## Where joinder generalises beyond roads

The mechanic is not road-specific. It applies wherever one failure produces many identical complaints: a fair-price shop denying rations to a whole village, a DISCOM feeder down across a ward, an employer whose PF deductions never reach EPFO for hundreds of workers, a builder delaying one tower, a PM-KISAN land-seeding error hitting every farmer in a revenue circle. In each case the current system multiplies effort on both sides. Joinder collapses it.

## Escalation triggers

- Signature count crossing a threshold **scaled to ward or Panchayat population**, not an absolute number — 50 signatures means something very different in a hamlet and in a metro ward.
- The 21-day clock breaching without an interim reply.
- A third recurrence of the same dedup key within twelve months — the pattern DARPG currently only sees in retrospective reports.

## Anti-gaming rules

- **One signature per verified mobile per case.** One aggrieved family cannot outrank fifty households.
- A photo's coordinates must fall inside the cell for the signature to count toward escalation.
- A case whose signatures come predominantly from outside the cell is **flagged for review, not escalated**.
- Rate limits per mobile per day and per cell per hour.
- **A signature can never trigger adverse action against a person** — only prioritisation of a public item. Brigading therefore buys attention and nothing else, which removes the incentive.
- Counts are public; identities are not. Signatories are never exposed to each other — a DPDP requirement, and a safety requirement where reporting is socially costly.

## What the citizen sees

One line, doing more emotional work than any status label: *"You are the 34th household in Rajnagar to report this road. At 50 it goes to the District Collector automatically."* Silent queuing feels identical to being ignored. A visible counter is the difference between filing into a void and joining something.

# 12. Identity, privacy, accessibility

## Do not mandate Aadhaar

Two reasons, and the legal one is decisive. Under the Aadhaar Act 2016 as amended by the Aadhaar and Other Laws (Amendment) Act, 2019, an entity may authenticate only if UIDAI permits it, and only where authentication is allowed by a law made by Parliament or prescribed by the Central Government in consultation with UIDAI. Voluntary use requires informed consent, and **no individual may be compelled to authenticate unless a law made by Parliament so provides.** There is no such law for grievance filing.

The practical reason is worse: Aadhaar OTP requires an Aadhaar-*linked* mobile, which is precisely what the rural elderly and many women lack. Mandating it raises the barrier in the name of lowering it. Note that PM-KISAN's own grievance flow already demonstrates the failure mode — instalments stall on exact-match mismatches between PM-KISAN, Aadhaar and bank records.

**Mobile OTP only** — what CPGRAMS already uses, and sufficient for one-signature-per-person. The brief separately forbids real Aadhaar, PAN, OTPs or payment data, so the demo uses mock identities throughout.

## DPDP Act 2023

A grievance is personal data, and this one carries voice recordings, precise geolocation, photographs and scheme entitlements. So: a consent notice in plain language at intake, purpose limitation to redressal only, retention limited and stated, and co-signer identities never disclosed to each other.

## Accessibility is a legal obligation, not a nicety

Sections 40, 42 and 46 of the Rights of Persons with Disabilities Act, 2016 require accessible electronic content and services from public and private providers alike. The operative standards are **GIGW 3.0**, **WCAG 2.1 Level AA** and **IS 17802**, and GIGW is mandatory for government websites. Build to them and say so — it converts an accessibility claim into a compliance claim.

> **Concrete targets.** Large tap targets, high-contrast mode, screen-reader labels on every control, voice as a first-class input rather than an add-on, and a page that works on 2G.

## Assisted filing, with the scribe on record

The real rural path runs through a Common Service Centre operator filing on someone's behalf — and pgportal's own homepage carries a warning that money is being extracted from the public even though filing is free. So make assisted mode first-class: the case binds to the **citizen's** mobile, the helper is recorded as scribe, the citizen receives the SMS and controls the case. It legitimises the channel villagers actually use while removing the capture.

# 13. Working safely at scale

The brief asks explicitly how the idea could work safely at a larger scale. Seven answers.

1. **Router, not registry.** Ek Awaaz files into CPGRAMS, sectoral portals and State portals through the API integration DARPG has already declared a priority. It never becomes a parallel system of record.
2. **The remedy ladder needs no cooperation.** Naming a citizen's statutory options is information, not integration — it scales the day it ships and asks nothing of any department.
3. **Identity stays minimal.** Mobile OTP; no Aadhaar mandate, for the legal reason above.
4. **Existing abuse controls are respected, not bypassed.** Spam, frivolous and habitual-complainant handling already exists in CPGRAMS; joinder reduces duplicate load rather than adding to it.
5. **Capacity is the real constraint.** Lowering the barrier without joinder would flood a queue nobody can clear. The load arithmetic in section 11 is the safety argument.
6. **Language runs on government infrastructure.** Bhashini for speech and translation, as Samadhan Didi and the multilingual RailMadad already do.
7. **The honest limit.** Without a statutory right, escalation carries no penalty — so the pilot should sit in a State with a right-to-service or grievance-redressal Act, where the clock has legal teeth. Elsewhere escalation is persuasion, and we say so.

**Rules we do not break.** No access to, testing of, or interference with any live government system. No undocumented private APIs. No scraping personal data. No real Aadhaar, PAN, passwords, OTPs, payment or health data. No government logos or framing implying official approval. No legal advice — the remedy ladder names options and cites the provision; it does not advise. All backend behaviour mocked and labelled.

# 14. Real versus mocked

Stated on the site itself, not just in the video — the brief scores honesty as one of six criteria.

| Component | In the demo |
|:----------|:------------|
| Voice and text intake, follow-up questions, case-file extraction | **Real** — OpenAI model, live |
| Remedy ladder lookup and the sentence it produces | **Real** — rules over the section 4 table, with provisions cited |
| Jurisdiction routing decision and its stated reasoning | **Real** — rules over the section 9 table |
| Joinder, dedup, signature counting, escalation thresholds | **Real** — running logic on seeded cases |
| Plain-language rewrite of an officer's reply | **Real** — model, on mock ATR text |
| Accessibility and low-bandwidth behaviour | **Real** |
| Filing into CPGRAMS, EPFiGMS, RBI CMS, Meri Sadak or any State portal | **Mocked** — no live government system is touched, by rule |
| Officer actions, Action Taken Reports, timestamps | **Mocked** — seeded synthetic case history |
| Identity, OTP, all personal data | **Mocked** — synthetic; no real Aadhaar or PAN anywhere |
| Remedy coverage beyond the demo domains | **Partial** — 13 domains mapped in this dossier, 3 wired in the build |
| District Compensation claim under the Bombay HC order | **Designed, not built** — shown as a routing destination |
| Panchayat-tier API | **Does not exist in reality** — the fallback path is the honest answer |

# 15. Five-day build sequence

Submission closes **28 August 2026 at 20:00 IST** with no grace period. The prototype must be built with Codex or powered by an OpenAI model, and Codex must be a meaningful part of how it is built — the video's second minute has to describe that honestly.

**Scope: three domains, one complete journey each.** Pick one rural, one urban, one legal-remedy showcase — a village road, a stuck PF claim, an ignored bank complaint. Three is enough to prove the engine generalises; more is scope suicide.

**Saturday 23 August**

- Lock scope to three domains. Resist every addition.
- Encode the section 4 remedy ladder and the section 9 routing table as data.
- Seed synthetic cases: one road with 33 prior signatures and a prior fix-and-break cycle; one PF claim; one 34-day-old bank complaint.
- Scaffold in Codex; commit from the start so the build story is real.

**Sunday 24 August**

- Voice and text intake to structured case file, with model-generated follow-ups.
- Two languages end to end — Hindi plus one non-Devanagari script.
- Geotagged photo capture.

**Monday 25 August**

- Remedy-ladder check before filing, with the provision cited on screen.
- Routing engine, with the reasoning sentence rendered.
- Joinder: dedup match, the add-your-name choice, live counter.
- Occurrence and escalation logic, plus anti-gaming rules.

**Tuesday 26 August**

- Citizen-confirmed closure gate and reopen-on-recurrence.
- Plain-language rewrite of the mock officer reply.
- Full honest-status vocabulary, including vigilance and no-route states.
- Accessibility pass against WCAG 2.1 AA; test throttled on mobile.

**Wednesday 27 August**

- Deploy the public link. Verify in a private window that it opens with no access request.
- Record the two-minute video; write the 250-word summary.
- Publish the real-versus-mocked table on the site itself.

**Thursday 28 August**

- Submit by mid-morning. Treat the 20:00 IST cutoff as already passed.
- Same email address everywhere — entries cannot be moved between addresses.

> **Round two.** If shortlisted in the top 250, one week of mentorship follows, then resubmission on 7 September, finalists announced 8–12 September, and finalists present in Bengaluru on 12 September. Hold in reserve: the remaining ten remedy domains, the compensation-claim route, and a second State's routing table.

# 16. Submission drafts

## Project summary — draft, about 238 words

*Recount before submitting — the limit is 250.*

India's grievance portal asks citizens to pick their problem's owner from 92 central organisations, then a category, then a sub-category. That vocabulary is file-noting: ministries write those categories to route work to officers, not for citizens to understand.

Relabelling them is no longer the hard part. In May 2026 the government launched Samadhan Didi — speak a grievance in 22 languages, classified automatically. Intake is solved. Two things are not.

Jurisdiction. A broken road may belong to NHAI, a state PWD, a PMGSY works department, a Gram Panchayat, a municipality or a cantonment board. No central ministry can fix a Panchayat road; local government is Entry 5 of the State List.

And remedy. Most grievances have a stronger remedy than a grievance. Delayed tax refunds carry statutory interest under Section 244A. A bank complaint unanswered for 30 days reaches the RBI Ombudsman, which can award ₹20 lakh. Ration denial has a District Grievance Redressal Officer under NFSA Section 15. CPGRAMS substitutes a non-statutory 21-day request for all of them, silently.

Ek Awaaz never asks which ministry. It infers the tier from location, routes to the real office, and names the strongest remedy the citizen holds. People join a case instead of filing another: fifty villagers become one case with fifty signatures, one report for the officer. Only a citizen can close a case.

All filing is mocked; no live government system was touched.

## Two-minute video — shot list

| Time | Shot |
|:-----|:-----|
| 0:00–0:10 | The 92-organisation dropdown on the real portal, scrolling. One line: "A villager with a broken road must pick from this. So must a salaried man whose PF is stuck." |
| 0:10–0:35 | Citizen demo one. A woman speaks one sentence in Hindi. Follow-up question. Photo. Filed. No ministry ever chosen. |
| 0:35–0:50 | Routing sentence on screen: Panchayat road → Block Development Officer, not Delhi. Cut to the tier table for three seconds. |
| 0:50–1:05 | Citizen demo two, the remedy ladder. Bank complaint, 34 days old. "You have a stronger right — the RBI Ombudsman, up to ₹20 lakh." One tap, different destination. |
| 1:05–1:20 | The counter: 34th household, escalates at 50. Then reopen-on-recurrence, then the closure gate — officer says fixed, citizen says no, case stays open. |
| 1:20–1:45 | How it was built. Codex in the loop, the model doing extraction and plain-language rewriting, the two lookup tables as data. Name the constraint: Entry 5, State List. |
| 1:45–2:00 | What is mocked, in plain words, on screen. Close on: "Intake was solved in May. This is the part after." |

> **Do not** open with the interface. Open with the dropdown — the problem is more persuasive than the solution.

# 17. Rubric crosswalk

| Criterion | What carries it |
|:----------|:----------------|
| Problem | Two evidenced gaps, not one opinion: a constitutional routing gap (Entry 5, the Eleventh and Twelfth Schedules) and a remedy gap across the highest-volume domains — Labour at 27,979 and Banking at 24,759 grievances in April 2026 alone. |
| Working build | Three domains, each journey complete — speak, check remedy, route, join, escalate, confirm. No admin panel. |
| Usability | Zero ministry choices. Voice-first, two languages, WCAG 2.1 AA and GIGW 3.0 targets, works throttled. |
| Product thinking | Positioned against Samadhan Didi rather than in ignorance of it. Aadhaar deliberately rejected, with the legal reason. Railways deliberately routed *to* CPGRAMS, because there it is correct. |
| End-to-end thinking | The remedy ladder, the routing table, the joinder load arithmetic, the closure inversion, and the statutory-pilot recommendation — all surfaced inside the citizen UI where reviewers will see them. |
| Honesty | Section 14 published on the site. The Panchayat tier is stated to have no API. Escalation is stated to have no legal teeth outside States with a right-to-service Act. Thin remedies — MGNREGA rules missing in most States — are named as thin. |

## Open decisions

The name *Ek Awaaz* leads on joinder; *Sahi Jagah* ("the right place") leads on routing; something like *Aapka Haq* ("your right") leads on the remedy ladder — which is arguably now the strongest idea in the dossier. Still to settle: which three domains ship, which State the demo sits in, whether the second language is Santhali or Odia, and whether the compensation-claim route ships now or is held for round two.

# Sources

1. [CPGRAMS portal](https://pgportal.gov.in/) — home, FAQ, process flow and the Central nodal officers list, read 23 August 2026.
2. [DARPG Office Memorandum, Comprehensive Guidelines for Handling Public Grievances](https://pgportal.gov.in/Home/Preview/Q29tcHJlaGVuc2l2ZUd1aWRlbGluZXNGb3JIYW5kbGluZ1RoZVB1YmxpY0dyaWV2YW5jZXMucGRm), 23 August 2024, with Annexure A.
3. [CPGRAMS user manual, NIC](https://pgportal.gov.in/CPGOFFICE/Documents/CPGRAMS-Help.pdf) — officer interface, including Manage Grievance Category.
4. [DARPG 47th monthly CPGRAMS report, March 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2252591&reg=3&lang=1) — receipts, disposals, pendency.
5. [Labour Ministry sees highest filing of grievances in 2025](https://www.business-standard.com/industry/news/labour-ministry-sees-highest-filing-of-grievances-in-2025-shows-data-126011800515_1.html), Business Standard — including EPFO's 29.3% share.
6. [Centre gets 5.59 lakh grievances to late June; Financial Services tops the list](https://assamtribune.com/national/centre-gets-559-lakh-public-grievances-till-jun-25-this-year-dept-of-financial-services-tops-list-1378542), Assam Tribune.
7. [Disposal up, but 5 lakh recurring complaints signal systemic gaps](https://techobserver.in/news/egov/cpgrams-data-disposal-up-but-5-lakh-recurring-complaints-signal-systemic-gaps-324778/), Tech Observer.
8. [Beyond digital box-ticking: a critical analysis of CPGRAMS](https://www.impriindia.com/insights/policy-update/beyond-digital-box-ticking-a-critical-analysis-of-indias-cpgrams/), IMPRI.
9. [Bombay HC fixes ₹6 lakh compensation for pothole deaths](https://www.livelaw.in/high-court/bombay-high-court/bombay-maharashtra-roads-pothole-deaths-civic-body-contractor-compensation-306827), LiveLaw, and [SCC Online on the Article 21 holding](https://www.scconline.com/blog/post/2025/10/15/right-to-safe-roads-fundamental-right-bombay-hc-orders-compensation-pothole-deaths/).
10. [74th Amendment and Municipalities in India](https://secforuts.mha.gov.in/74th-amendment-and-municipalities-in-india/) — Twelfth Schedule and Entry 5 of the State List.
11. [PRS: Right of Citizens for Time Bound Delivery Bill, 2011](https://prsindia.org/billtrack/the-right-of-citizens-for-time-bound-delivery-of-goods-and-services-and-redressal-of-their-grievances-bill-2011-citizens-charter), and [its lapse with the 15th Lok Sabha](https://en.wikipedia.org/wiki/Citizen%27s_Charter_and_Grievance_Redressal_Bill,_2011).
12. [Bihar Right to Public Grievance Redressal Act, 2015](https://www.indiacode.nic.in/handle/123456789/6208?locale=en), and [the DARPG delegation's study of it](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2090064).
13. [State legislation on the right to time-bound delivery of services](https://accountabilityindia.in/wp-content/uploads/2020/03/policy_brief_right_to_service_laws_0.pdf), Accountability Initiative; [Karnataka Sakala Services Act, 2011](https://en.wikipedia.org/wiki/Karnataka_Sakala_Services_Act,_2011); [Rajasthan Guaranteed Delivery of Public Services Act, 2011](https://rajras.in/rajasthan-guaranteed-delivery-public-services-act/).
14. [National Food Security Act, 2013](https://www.indiacode.nic.in/bitstream/123456789/11233/1/the_national_food_security_act,_2013.pdf) — sections 14, 15 and 16.
15. [Reserve Bank Integrated Ombudsman Scheme, 2021](https://financialservices.gov.in/beta/sites/default/files/RB-IOS%202021_0.pdf), and the [RBI FAQ](https://www.rbi.org.in/commonperson/english/scripts/FAQs.aspx?Id=3407).
16. [Consumer Grievance Redressal Forums and Electricity Ombudsman](https://www.orierc.org/Tariff_SLDC.aspx/Grievance_Redressal_Forums_and_Ombudsman.aspx) — Electricity Act 2003, ss. 42(5) and 42(6).
17. [Income tax refund delay and Section 244A interest](https://taxguru.in/income-tax/income-tax-refund-delay-tracking-causes-section-244a-interest.html), TaxGuru.
18. [EPFiGMS](https://epfigms.gov.in/) and [EPFO escalation and appellate route](https://evaakil.com/epfo-legal-guide/).
19. [Critical evaluation of MGNREGA](https://prsindia.org/policy/report-summaries/critical-evaluation-of-mgnrega), PRS — Ombudsperson, delay compensation, unemployment allowance.
20. [Consumer Protection Act, 2019](https://www.indiacode.nic.in/handle/123456789/15256?locale=en), and [e-Daakhil / e-Jagriti](https://en.wikipedia.org/wiki/E-Jagriti).
21. [TRAI grievance redressal mechanism](https://www.trai.gov.in/consumer-info/telecom/grievance-redressal-mechanism) and [the 2026 draft regulations](https://righttoinformation.wiki/file-trai-telecom-complaint-2026).
22. [RailMadad](https://www.digitalindia.gov.in/initiative/railmadad/) and [helpline 139](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1703201&reg=48&lang=2).
23. [PM-KISAN beneficiary problems and grievance tiers](https://www.bajajfinserv.in/pm-kisan-samman-nidhi-problems-beneficiaries-face).
24. [Real Estate (Regulation and Development) Act, 2016](https://en.wikipedia.org/wiki/Real_Estate_%28Regulation_and_Development%29_Act,_2016) — Authority, Adjudicating Officer, Appellate Tribunal.
25. [Aadhaar and Other Laws (Amendment) Act, 2019](https://uidai.gov.in/images/news/Amendment_Act_2019.pdf), and [PRS analysis](https://prsindia.org/billtrack/the-aadhaar-and-other-laws-amendment-bill-2019).
26. [India's digital accessibility law](https://www.digitala11y.com/indias-digital-accessibility-laws-and-overview/) — RPwD Act 2016 ss. 40, 42, 46; GIGW 3.0; WCAG 2.1 AA; IS 17802.
27. [Samadhan Didi launch](https://techobserver.in/news/egov/samadhan-didi-ai-voice-chatbot-cpgrams-launch-324974/), 30 May 2026, and [Drishti IAS summary](https://www.drishtiias.com/state-pcs-current-affairs/samadhan-didi-ai-voice-chatbot-launched).
28. [Meri Sadak citizen feedback system, NRIDA](https://pmgsy.nic.in/citizen-feedback-complaints-redressal-system-under-pmgsy-meri-sadak-mobile-app-1).
29. [Common Service Centres cross 5 lakh](https://impressivetimes.com/national/common-service-centres-digital-india-expansion/), and [state grievance portals compared, 2026](https://righttoinformation.wiki/state-grievance-portals-comparison-india-2026).
30. [Build What Moves India — builder brief](https://buildwhatmovesindia.com/brief), read 23 August 2026.

*This is an independent hackathon submission document. It is not an official government product and carries no government endorsement.*
