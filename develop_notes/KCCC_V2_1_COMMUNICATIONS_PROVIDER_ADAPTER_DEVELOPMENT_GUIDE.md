# KCCC V2.1 — Communications provider adapter development guide

**Scope:** D22 vendor adapter implementation  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`

## Rule zero — never bypass the interface

All vendor integration lives behind the dispatch adapter boundary. Mission services, API routes, and React components **must not**:

- Import vendor SDKs or call vendor HTTP APIs directly
- Branch on vendor-specific logic outside `src/lib/missions/v21/communications/providers/`
- Store API keys in the database or return secrets to clients

Flow: **Mission → Dispatch service → Interface → Adapter → Vendor**

## Location

```
src/lib/missions/v21/communications/providers/
├── provider-registry.ts      # Register keys here
├── types.ts                  # CanonicalCommunicationsProvider alias/export
├── disabled-adapter.ts       # (or re-export from dispatch/)
├── kccc-sandbox-adapter.ts   # Certification harness
├── resend-adapter.ts         # Official D22 vendor
└── shared/                   # Optional shared verify/normalize helpers
```

## Contract — `CanonicalCommunicationsProvider`

Adapters implement the canonical interface (aligned with D21 `CommunicationProviderAdapter` in `dispatch/types.ts`):

| Method | Purpose |
|--------|---------|
| `providerKey` | Stable slug (e.g. `resend`, `sendgrid`) |
| `supportedChannels` | `EMAIL` / `SMS` subset |
| `isTestAdapter` | `true` only for harnesses never selectable in production |
| `inspectConfiguration()` | Read env presence; **never return secret values** |
| `verifyConnection()` | Credential test against vendor sandbox API |
| `discoverCapabilities()` | Return `ProviderCapabilityReport` flags |
| `validateSender()` | Domain/sender verification state |
| `preflight()` | Delegate to shared `evaluateDispatchPreflight` + adapter warnings |
| `dispatch()` | Outbound send — **respect `mode: SANDBOX` at D22** |
| `reconcile()` | Lookup by idempotency / provider message ID |
| `verifyWebhook()` | Signature + timestamp + replay fingerprint |
| `normalizeWebhook()` | Map to `NormalizedDeliveryEvent[]` |

Export type alias in `providers/types.ts`:

```typescript
export type CanonicalCommunicationsProvider = CommunicationProviderAdapter;
```

## Implementing a new adapter

### 1. Create adapter module

Example: `providers/sendgrid-adapter.ts`

- Read secrets from `process.env.KCCC_SENDGRID_API_KEY` (document in deliverable doc, not in code comments with values)
- Use server `fetch` or minimal HTTP client — no secrets in URLs logged
- Map vendor errors to `ProviderDispatchResult` outcomes (`ACCEPTED`, `REJECTED`, `UNKNOWN`, `BLOCKED`)
- Set `isTestAdapter: false` for real vendors

### 2. Sandbox vs production behavior

At D22 ship, adapters must:

- Honor connection `mode` from inspect/verify — refuse `PRODUCTION` dispatch unless `PRODUCTION_DISPATCH_APPLICATION_ENABLED` capability is explicitly enabled in a future enablement pass
- Use vendor sandbox endpoints when mode is `SANDBOX`
- Never send to non-test destinations in certification (use vendor sandbox allowlists)

### 3. Register in `provider-registry.ts`

```typescript
// Pseudocode — match actual registry API
registerProvider("sendgrid", () => new SendGridAdapter());
registerProvider("resend", () => new ResendAdapter());
registerProvider("kccc-sandbox", () => new KcccSandboxAdapter(), { certificationOnly: true });
```

Rules:

- Unknown keys → `disabled` adapter (fail closed)
- `kccc-test` (D21 unit test adapter) — **not** registered for production mode
- `kccc-sandbox` — selectable for certification drills; `isTestAdapter: true` or flagged certification-only

### 4. Webhooks

- Implement vendor-specific signature verification in adapter only
- Use shared `DEFAULT_WEBHOOK_TOLERANCE_SECONDS` (300s) unless vendor requires stricter
- Compute deterministic `replayFingerprint` for dedupe
- See `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_VALIDATION_GUIDE.md`

### 5. Tests

- Unit tests with mocked `fetch` — no live network in CI
- Extend `kccc-sandbox` scenarios before vendor-specific tests
- Run `npm run missions:v21:communications-provider:validate`

### 6. Documentation

- Update `KCCC_V2_1_COMMUNICATIONS_PROVIDER_COMPARISON_MATRIX.md` (Installed vs Available)
- Add env var names to credential rotation guide
- Complete sandbox certification checklist before marking Installed

## Reference implementation — Resend (D22)

| Aspect | Pattern |
|--------|---------|
| HTTP | Server `fetch` to Resend REST API |
| Auth | `Authorization: Bearer ${process.env.KCCC_RESEND_API_KEY}` |
| Webhook | Resend signing secret → `KCCC_RESEND_WEBHOOK_SECRET` |
| Idempotency | Pass Kelly `idempotencyKey` as vendor idempotency header when supported |

## Anti-patterns

| Do not | Why |
|--------|-----|
| Call Resend/SendGrid from `communications-dispatch-service.ts` | Breaks neutrality |
| Add vendor fields to Prisma models | Secrets and coupling |
| Return raw vendor JSON to browser | Leakage + coupling |
| Skip registry registration | Unknown key silently disabled — adapter unreachable |
| Enable `applicationDispatchEnabled` in adapter code | Operator/control plane only |
| Send production messages in adapter unit tests | Compliance |

## Related

- `KCCC_V2_1_COMMUNICATIONS_SANDBOX_CERTIFICATION_CHECKLIST.md`
- `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_SECURITY.md`
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_SELECTION_GUIDE.md`
