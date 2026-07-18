# Cursor Build Instructions

**Kelly Campaign Command Calendar (KCCC)**  
Agent operating manual — paste into new Cursor threads working on this lane.

Version: **1.1.0**

---

## Session bootstrap (read first)

1. Confirm workspace includes `H:\SOSWebsite\kelly-calendar\` (or `Kelly-calendar\` — same folder on Windows)
2. Read `README.md` → current step number
3. Read `docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md` for step scope
4. Obey `docs/H_DRIVE_FOREVER_PROTOCOL.md` — **no C: writes**
5. Obey `docs/MASTER_PRODUCT_CONSTITUTION.md` — AI proposes, humans approve

**Do not** import from `RedDirt/src/**`. **Do not** edit other SOSWebsite lanes unless Steve approves.

---

## Active lane

```text
Lane:     kelly-calendar
Path:     H:\SOSWebsite\kelly-calendar\
Git:      https://github.com/Grappe501/kelly-calendar
Deploy:   Netlify (separate from RedDirt)
Env:      Fallback to H:\SOSWebsite\RedDirt\.env.local
Current:  Step 3 complete — begin Step 4 (AUTH + calendar membership RBAC)
Federation: docs/CALENDAR_FEDERATION_ARCHITECTURE.md is binding
```

RedDirt work continues in parallel — this lane is independent.

---

## Command discipline

```powershell
cd H:\SOSWebsite\kelly-calendar

# Always wrap toolchain:
node scripts/run-with-h-drive-env.cjs npm install
node scripts/run-with-h-drive-env.cjs npm run dev
node scripts/run-with-h-drive-env.cjs npm run typecheck
node scripts/run-with-h-drive-env.cjs npm run build
```

Preflight before install/build:

```powershell
node scripts/run-with-h-drive-env.cjs node -e "console.log(process.env.TEMP)"
# Must contain: H:\SOSWebsite\.local\temp\kelly-calendar
```

---

## End-of-pass checklist

- [ ] Step acceptance gates passed (`docs/ACCEPTANCE_GATES.md`)
- [ ] README step indicator updated
- [ ] Registry step status updated
- [ ] `git status` — lane only, no secrets
- [ ] `git commit` with `kccc(step-N): ...` message
- [ ] `git push origin main`
- [ ] Pass summary with branch, hash, push status

Steve requested **commit after every interaction**.

---

## AI implementation rules

When building AI features (Step 16+):

```typescript
// CORRECT — server route only
export async function POST(req: Request) {
  const draft = await proposeEventFromNaturalLanguage(text);
  await prisma.eventAiProposal.create({ data: { ...draft, status: "draft" } });
  return Response.json({ proposalId, draft, labels: { confirmed, interpreted, missing } });
}

// WRONG — never auto-create calendar event from AI
// WRONG — never expose OPENAI_API_KEY to client
```

UI must show three-class labels: **Confirmed · Interpreted · Missing · Recommended**

User taps **Approve** → separate API call creates `calendar_events` record.

---

## Mobile-first UI checklist

- Design at 375px first
- Bottom nav: `Today | Calendar | + Add | Search | More`
- Today view is default route `/`
- Large tap targets for Kelly on the move
- Departure time prominently displayed on Today and event pages

---

## Product copy tone

Operational, calm, candidate-grade — not generic SaaS.

Good: `Leave by 10:42 AM · 48 min drive`  
Bad: `Event starting soon!!!`

---

## Step-by-step agent prompts

### Step 4 prompt

> Implement auth + calendar membership RBAC per CALENDAR_FEDERATION_ARCHITECTURE.md: system roles, calendar/event/section permissions, AVAILABILITY_ONLY, default-deny. No real schedule PII. Commit and push.

### Step 5 prompt

> Create federated Prisma schema (kccc_calendars, groups, memberships, permissions, roll-up rules, M2M event memberships, visibility, audit). Seed system calendars + standing availability. No real PII. Commit and push.

### Step 7 prompt

> Event CRUD with primary + connected calendars, visibility, and Command roll-up behavior. Commit and push.

### Step 8 prompt

> Build Today command center per MASTER_PRODUCT_CONSTITUTION Article IV. Next event, leave-by, prep list, day remainder. Mobile-first. Pass Step 8 gates. Commit and push.

### Step 16 prompt

> Implement POST /api/ai/propose-event using OpenAI structured outputs. Store draft in event_ai_proposals. Review UI with Approve/Reject. Never auto-publish. Pass Step 16 gates. Commit and push.

---

## Hard stops

Stop immediately and report if:

1. `lane:preflight` or H: TEMP check fails
2. Secrets in diff or terminal output
3. Cross-lane files touched
4. Migration order break
5. Same test fails twice

---

## Completion response format

```markdown
## KCCC Pass Summary

**Lane:** kelly-calendar  
**Step:** N — title  
**Files changed:** …  
**Commands:** … (exit codes)  
**Git:** branch · `abc1234` · pushed  
**H: preflight:** pass  
**Next:** Step N+1  
```

---

## Version history

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-07-17 | Initial agent manual for Step 1 |
| 1.0.1 | 2026-07-18 | Align with constitution v1.0.1 navigation + AI capability list |
| 1.1.0 | 2026-07-18 | Federated Command Calendar — Step 4/5 prompts broadened |
