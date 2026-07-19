# EA-4 Visual and Experience Audit — Forensic Report

**Script ID:** `KCCC-EA-4-VISUAL-AND-EXPERIENCE-AUDIT`  
**Parent:** `KCCC_ENGINEERING_AUDIT.md`  
**Status:** COMPLETE (diagnostic)  
**Nature:** Product teardown — **no code · no mockups · no implementation decisions**  
**Mission question:** How do we make this feel like the best campaign command center in politics?  

**Evidence basis:** DayView / WeekView / MonthView structure, shared `globals.css` tokens, panel/chip/nav patterns (repo inspection 2026-07-19).

---

## Success criteria (answered)

| Question | Answer |
|----------|--------|
| Why does V1 feel “boring”? | Same panel recipe everywhere; muted engineering copy; no hero “what matters now”; weak category/urgency language; Day/Week/Month are siblings of identical chrome |
| What most hurts operator confidence? | Domain strip all Unknown (honest but demoralizing); readiness buried in prose; no two-second scan path; conflicts not visually dominant |
| Greatest-impact improvements? | Hero layer · view personalities · campaign identity header · legend/category color · decision-first section order |
| What should never change? | Honest Unknown; non-owning presentation; Day→Week→Month drill-down; executive questions; safe projections |
| Permanent design language? | Tokens + legend + hero pattern + status treatments + view personality rules → XR-1 / XR-2 / XR-3 / XR-5 |

---

## Severity / Effort legend

| Severity | Meaning |
|----------|---------|
| Critical | Blocks command-center feel or operator confidence |
| High | Major friction / sameness |
| Medium | Noticeable polish gap |
| Low | Nice-to-have |
| Keep | Working well — protect |

| Effort | Meaning |
|--------|---------|
| S | Small (tokens / copy / CSS) |
| M | Medium (shared components) |
| L | Large (view redesign) |
| XL | Cross-view system |

---

# 4A Visual Language

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| Warm cream + teal tokens exist, but calendar views barely use hierarchy (display font only on h1; body is system UI) | High | Feels generic admin, not campaign brand | XR-1: elevate display type for hero/countdown; define status/category color roles beyond warning/success/danger | M | XR-1, XR-2 |
| Panels are near-identical white cards with same border/radius/padding | Critical | Visual sameness = “boring” | XR-1 elevation scale; hero surface vs secondary panels | M | XR-1 |
| No calendar legend / event category color language | Critical | Operators can’t scan event types | Shared legend (Campaign, Travel, Volunteer, Media, Fundraising, Petition, Compliance, Deadline, Personal, Unknown) | M | XR-1, Foundation |
| Shadow tokens exist (`--shadow-md`) but calendar surfaces rarely use depth | Medium | Flat, low energy | Selective elevation for hero + next mission | S | XR-1 |
| Engineering meta copy in headers (“Engineering Track A · presentation only”) | High | Breaks immersion; sounds like staging | Remove from operator chrome; keep in system/dev surfaces | S | XR-2 |
| Chip nav uses dashed inactive pills — reads unfinished | Medium | Undermines polish | Solid inactive + strong active state; “next” as subdued label | S | XR-1 |

**Keep:** Token foundations (`:root` colors/spacing/radius); focus-visible outline; skip-link.

---

# 4B Layout & Information Hierarchy

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| All three views: `h1 Calendar` → executive question → meta → switcher → nav → equal `panel` stack | Critical | No focal point; unequal info gets equal weight | XR-5 hero first; demote meta; reorder by decision value | L | XR-3, XR-5 |
| Day: Readiness panel before Schedule/Missions | High | Next event/mission not visually first | Lead with next mission + time marker; readiness as strip | M | XR-3 Day |
| Week: Domain strip of ten Unknown tiles dominates above week grid | Critical | Honest Unknown becomes demoralizing wallpaper | Collapse Unknown into “Domain readiness · open modules”; elevate week grid + mission rail | M | XR-3 Week, Trust Model |
| Month: Highlights and prose often appear before grid density story | Medium | Strategic view should lead with heat/milestones visually | Hero month story → density grid → highlights | M | XR-3 Month |
| Desktop `app-main` capped ~48rem — month grid cramped | High | Month can’t feel expansive | Wider calendar shell at desktop; keep mobile narrow | M | XR-1, 4F |
| Governance footnotes inside operator panels (“not a canonical registry”) | Medium | Cognitive load; sounds legalistic | Tooltips / “About this number” drawer | S | XR-2 |

**Keep:** Shared switcher + date nav; drill-down Day/Week links on month cells.

---

# 4C Interaction Design

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| Click targets exist (day number, W, chips) but feedback is mostly link color | Medium | Feels passive | Hover/active states; press feedback on cells | S | XR-4 |
| No expandable day/event preview — full navigation only | High | Month/Week density hard to inspect quickly | Side panel / popover preview before navigate | L | XR-6 |
| Filters/search absent | High | Only way to reduce noise is change view | Foundation filter engine after Redesign | L | Foundation |
| Conflicts listed as text lists, not actionable objects | High | Risk not actionable | Conflict cards with severity chrome + deep link | M | XR-6, XR-7 |
| Previous/Next buttons are generic secondary | Low | Missed orientation cue | “← Sun” / “Week of…” labels | S | XR-3 |

**Keep:** Predictable `?view=&date=` model; month W → week, day → day.

---

# 4D Motion & Microinteractions

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| No view-transition between Day/Week/Month | High | Weak sense of zooming the campaign | Shared transition / shared axis animation | M | XR-4 |
| `prefers-reduced-motion` kills all animation — good — but almost nothing to reduce | Keep/Low | A11y ready; experience static | Add respectful motion set with reduced-motion off-ramp | M | XR-4, EA-5 |
| No loading skeletons for calendar data | Medium | Feels abrupt / unfinished | Skeleton panels per view | M | XR-4, 4G |
| Readiness/conflict state changes have no feedback language | Medium | Missed urgency | Pulse/badge only on Critical/Blocked | S | XR-4 |

---

# 4E Emotional Experience

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| Tone is explanatory and cautious, not commanding | Critical | Feels like docs, not HQ | Action verbs; “What matters now”; countdown as pulse | M | XR-2, XR-7, 4L |
| No celebration of progress (missions done, counties visited) | Medium | No reinforcement loop | Subtle delight moments (4K) | M | XR-4, XR-7 |
| Unknown honesty is correct but emotionally cold when over-exposed | High | Operator feels “system empty” | Frame Unknown as “awaiting owner” with clear CTA | S | XR-2, Trust Model |

---

# 4F Responsive & Mobile

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| Week 7-column grid collapses to 1 column — good fallback, loses week gestalt | High | Week personality dies on mobile | Horizontal snap-scroll week strip | L | XR-3, XR-1 |
| Month grid → 2 columns on small screens — awkward calendar | High | Breaks month mental model | Stack density list + “open day” or 7-col micro cells | L | XR-3 Month |
| Bottom nav competes with long panel stacks | Medium | Fatigue scrolling past chrome | Sticky hero + compact sections | M | XR-5 |
| Touch targets generally OK (buttons ~48px elsewhere); month “W” is tiny | Medium | Miss-taps | Larger week affordance | S | EA-5 |

**Keep:** Bottom nav pattern; safe-area padding; focus-visible.

---

# 4G Empty / Loading / Unknown States

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| Empty days/missions use muted “—” / prose — functional, not branded | Medium | Missed coaching moment | Empty states with next action (“Add mission”, “Open Field”) | S | XR-1 |
| Partial catalogue warning is honest (Keep) but easy to miss | Medium | Trust risk if ignored | Persistent catalogue badge in hero | S | XR-5 |
| Domain Unknown tiles look like broken readiness | Critical | Undermines confidence | Don’t tile Unknown as status; link-out strip | M | XR-3 Week |
| No dedicated loading UI | Medium | Perceived sluggishness | Skeletons | M | XR-4 |
| Error states not specialized on calendar routes | Low | Generic fail closed elsewhere | Calendar-scoped error panel pattern | S | EA-8 |

**Keep:** Explicit Unknown doctrine; partial catalogue disclosure; no invented readiness %.

---

# 4H Campaign Brand Identity

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| No Kelly / campaign wordmark or photography layer on calendar | Critical | Not “Kelly HQ” | XR-2 command identity header (brand-safe, not stock SaaS) | L | XR-2 |
| Election countdown present as plain text, not a campaign pulse | High | Lost emotional lever | Countdown as primary metric in hero | M | XR-5 |
| Serif display font defined but underused | Medium | Brand asset idle | Use for view titles / phase labels | S | XR-1 |
| Cream/teal aesthetic risks “warm SaaS” without campaign energy | High | Memorable politics ≠ soft admin | Sharper contrast accents; phase colors; urgency reds for conflicts | M | XR-1, XR-2 |

---

# 4I Information Density

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| Vertical whitespace between many equal panels → slow scan | High | >2s to find next event | Compress secondary panels; densify hero | M | XR-5, XR-3 |
| Month density tint is subtle (rgba teal) — easy to miss | Medium | Heat map fails | Stronger heat scale + legend | S | XR-6 |
| Two-second test (today’s mission / next event / risk / travel / conflicts) currently fails without scrolling | Critical | Operators lose the war of attention | Hero Information Layer with those five signals | L | XR-5 |

**Scan targets (must be above fold on Day):** next mission · next event time · top risk/conflict · travel leave-by · readiness state.

---

# 4J Executive Decision Support

| Finding | Sev | Why it matters | V2 recommendation | Effort | Deps |
|---------|-----|----------------|-------------------|--------|------|
| Executive questions exist (Keep) but are styled as muted subtitles | High | Decision frame underpowered | Make question the hero eyebrow; answer in hero metrics | M | XR-5, XR-7 |
| Sections don’t map to decisions (“Should I leave?”, “What slips?”, “Where to push?”) | High | Content without consequence | Label sections by decision; hide non-decision noise | M | XR-7 |
| Week domain strip does not support a decision (all Unknown) | Critical | Wasted attention | Replace with decision CTA to owning modules | M | XR-3 |
| Month brief bullets are good seeds but low visual authority | Medium | Storytelling underplayed | Executive story card | M | XR-7 |

**Keep:** Standing executive questions per view; links to `/brief` and `/command`.

---

# 4K Delight Moments

| Opportunity | Sev | Why it matters | V2 recommendation | Effort | Deps |
|-------------|-----|----------------|-------------------|--------|------|
| Mission completion / day cleared | Low | Reinforces progress | Quiet checkmark / tone (optional) | S | XR-4 |
| Countdown milestones (100/60/30 days) | Medium | Campaign energy | Milestone chip in hero | S | XR-2 |
| County visit / coverage achievements | Medium | Field pride | Soft achievement toast from geo signals | M | XR-7 |
| Smooth Day↔Week↔Month zoom | High | Feels alive | Shared motion language | M | XR-4 |
| Successful schedule save (elsewhere) | Low | Trust the system | Confirmations consistent with calendar chrome | S | XR-4 |

Rule: delight reinforces progress — never distracts from risk.

---

# 4L Emotional Tone

| View | Current (observed) | Desired | Gap |
|------|--------------------|---------|-----|
| Day | Functional, documentary | Focused, confident | No “Today” identity; no time-now marker; missions after readiness prose |
| Week | Organized checklist of panels | Coordinated, energized | Unknown tile wall; weak rhythm chrome |
| Month | Informational report | Strategic, visionary | Narrow layout; soft heat; highlights as bullet list |

---

# Why Version 1 feels boring (synthesis)

1. **Same chrome recipe** on every view (Calendar h1 → muted meta → chips → panels).  
2. **No hero answer** to the executive question in two seconds.  
3. **Equal visual weight** for governance footnotes, Unknown tiles, and mission-critical conflicts.  
4. **Category blindness** — events are title strings, not campaign types.  
5. **Emotionally cautious copy** (“presentation only”, “not a registry”) in the operator path.  
6. **Static** — no motion, weak transitions, subtle density.  
7. **Brand under-expression** — tokens exist; campaign command identity does not.

---

# What is already working (protect)

- Architecture honesty: Unknown, non-ownership, partial catalogue warnings  
- Distinct executive questions per Day / Week / Month  
- Drill-down model (`view` + `date`)  
- Mission cards (richer than bare event rows) when used  
- Focus-visible, skip-link, reduced-motion kill-switch  
- Tokenized color/spacing base (even if underused)

---

# Design Principles (from EA-4)

1. **Command first** — every view opens with what matters now.  
2. **One family, three personalities** — Day urgent · Week tactical · Month strategic.  
3. **Honesty with warmth** — Unknown stays Unknown; frame it as awaiting an owner, not failure.  
4. **Unequal information, unequal weight** — risk and next action outrank footnotes.  
5. **Campaign, not SaaS** — brand, countdown, geography, mission language.  
6. **Motion clarifies** — transitions explain zoom; never invent state.  
7. **Decision or delete** — if a block doesn’t help a decision, demote or remove from default chrome.  
8. **Scan in two seconds** — hero metrics for mission, event, risk, travel, conflicts.

---

# Version 2 Design Goals

| Goal | Measure |
|------|---------|
| Best-in-class campaign command feel | Operator “HQ” sentiment in walkthrough |
| Two-second orientation | Hero contains mission + risk + travel/conflict signals |
| Distinct Day/Week/Month personalities | Blind test: users identify view from screenshot chrome alone |
| Legend literacy | Operators name event categories without reading titles |
| Confidence under Unknown | Unknown never looks like a broken dashboard |
| Protect Architecture 1.0 | Zero ownership invent; redesign is presentation |

---

# Experience Requirements (inputs to XR-1…XR-7)

| Req ID | Requirement | Maps to |
|--------|-------------|---------|
| XR-REQ-01 | Shared visual design system (type, space, color roles, elevation, legend, motion tokens) | XR-1 |
| XR-REQ-02 | Campaign command identity header (countdown, phase, brand-safe presence) | XR-2 |
| XR-REQ-03 | Day personality: today identity, now marker, next-action primacy | XR-3 |
| XR-REQ-04 | Week personality: rhythm chrome; no Unknown tile wall | XR-3 |
| XR-REQ-05 | Month personality: wide strategic canvas; strong heat + milestones | XR-3 |
| XR-REQ-06 | Hero Information Layer on all three views | XR-5 |
| XR-REQ-07 | Conflict/risk visual dominance + actionable affordances | XR-6, XR-7 |
| XR-REQ-08 | View-transition motion with reduced-motion respect | XR-4 |
| XR-REQ-09 | Empty/loading/Unknown branded patterns with CTAs | XR-1, 4G |
| XR-REQ-10 | Executive storytelling card (pressure, geography, decisions) | XR-7 |
| XR-REQ-11 | Mobile week/month patterns that preserve gestalt | XR-3, 4F |
| XR-REQ-12 | Remove engineering meta from operator chrome | XR-2 |

---

# Prioritized Redesign Backlog (for Experience Redesign 2.0)

| Priority | Item | Impact | Effort | XR |
|----------|------|--------|--------|-----|
| P0 | Hero Information Layer (Day/Week/Month) | Critical | L | XR-5 |
| P0 | Retire Unknown domain tile wall; decision CTAs | Critical | M | XR-3 |
| P0 | Shared event category legend + color | Critical | M | XR-1 |
| P1 | Campaign command identity header + countdown pulse | High | L | XR-2 |
| P1 | Day redesign: next mission / now marker first | High | L | XR-3 |
| P1 | Week redesign: grid + mission rail primacy | High | L | XR-3 |
| P1 | Wider desktop calendar shell | High | M | XR-1 |
| P2 | Month heat + milestone visual language | High | L | XR-3, XR-6 |
| P2 | Conflict cards + severity chrome | High | M | XR-6 |
| P2 | View transitions + skeletons | Medium | M | XR-4 |
| P2 | Operator copy pass (remove eng meta; action verbs) | High | S | XR-2 |
| P3 | Delight milestones / county achievements | Medium | M | XR-4, XR-7 |
| P3 | Expandable previews / side panel | Medium | L | XR-6 |
| P3 | Filters/search | High | L | Foundation (after Redesign) |

---

## Deliverable chain (complete)

```text
EA-4 Findings ............... this document
        ↓
Design Principles ........... § above
        ↓
Version 2 Design Goals ...... § above
        ↓
Experience Requirements ..... XR-REQ-01…12
        ↓
Prioritized Redesign Backlog  P0–P3
```

## Explicit non-outcomes

- No code, mockups, or token changes in this pass  
- Does not open Experience Redesign implementation (still BLOCKED until Audit + Hardening)  
- Does not start Foundation  
- Does not amend Architecture 1.0  

## Architecture 1.0 Conformance Statement

Diagnostic only. Protects Unknown doctrine and non-owning presentation.  
**Affirms:** No amendments to Architecture 1.0 baseline (`6690ce2`).
