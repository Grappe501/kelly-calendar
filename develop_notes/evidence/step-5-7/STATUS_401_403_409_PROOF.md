# STATUS_401_403_409_PROOF.md

**Step:** KCCC-STEP-05.7-NETLIFY-AUTH-AND-LIVE-MUTATION-PROOF  
**Status:** PASS  
**Date:** 2026-07-18  
**Deploy URL:** https://kelly-calendar.netlify.app  

| Code | Proof |
| --- | --- |
| 401 | Anonymous GET/POST `/api/events` rejected |
| 403 | Authenticated `advisor@example.invalid` create rejected |
| 409 | Authenticated manager PATCH with stale `expectedVersion` rejected |
