# Step 5.6 Deployment Report

**Status:** BLOCKED pending operator Netlify configuration

| Item | Status |
| --- | --- |
| Local production build | GREEN |
| RedDirt structural difference | 0 |
| `candidate_data_ready` | false |
| Netlify `APP_SESSION_SECRET` | NOT configured (fail closed) |
| Netlify `DATABASE_URL` / `DIRECT_URL` | Operator responsibility |
| Auto-seed in production | Disabled / not run |
| Destructive migrate on build | Avoided |

Protected pages redirect to `/login`. Protected mutation APIs return 401 without a valid session. Development seed users must not be used in production unless an explicit staging exception is approved.
