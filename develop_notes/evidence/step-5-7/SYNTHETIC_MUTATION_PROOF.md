# SYNTHETIC_MUTATION_PROOF.md

**Step:** KCCC-STEP-05.7-NETLIFY-AUTH-AND-LIVE-MUTATION-PROOF  
**Status:** PASS  
**Date:** 2026-07-18  
**Deploy URL:** https://kelly-calendar.netlify.app  
**Deploy commit:** 239f697  

Synthetic identities only (`@example.invalid`). No real Kelly/staff/donor/voter records.

| Gate | Result |
| --- | --- |
| Unauthenticated access | PASS (401) |
| Authenticated access | PASS (login 200 + session cookie) |
| Insufficient role | PASS (advisor create → 403) |
| Valid synthetic write | PASS (manager create → 200) |
| Conflict / stale write | PASS (expectedVersion mismatch → 409) |
| Audit record | PASS (AuditLog entityId present) |
| Safe projection | PASS (no passwordHash / secret fields) |
| Synthetic cleanup | PASS (archive with reason) |

Do not treat passwords or connection strings as part of this evidence.
