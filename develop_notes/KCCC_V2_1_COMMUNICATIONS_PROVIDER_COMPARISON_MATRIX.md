# KCCC V2.1 — Communications provider comparison matrix

**Scope:** Capability comparison only — not a vendor recommendation  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`  
**Updated:** D22 ship

Legend:

- **Installed** — Adapter registered in Kelly Calendar code
- **Available** — Documented stub; implement per adapter development guide
- **—** — Not applicable or not planned for channel

Kelly selects **one** active `KCCC_COMMUNICATIONS_PROVIDER_KEY` at a time. Neutrality: compare capabilities; choose based on operational fit + certification results.

## Matrix

| Capability | disabled | kccc-sandbox | resend | sendgrid | mailgun | postmark | amazon-ses | twilio | mailersend |
|------------|:--------:|:------------:|:------:|:--------:|:-------:|:--------:|:----------:|:------:|:----------:|
| **Adapter status** | Installed | Installed | Installed | Available | Available | Available | Available | Available | Available |
| EMAIL send | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| SMS send | — | Installed | — | Available | Available | — | Available | Available | Available |
| Sandbox mode | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Server-side outbound only | Installed | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Signed webhooks | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Delivery events | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Bounce handling | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Complaint / spam | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Unsubscribe / opt-out | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Suppression sync | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Native idempotency | — | Installed | Available | Available | Available | Available | Available | Available | Available |
| Batch dispatch (≤25) | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Status reconciliation | — | Installed | Installed | Available | Available | Available | Available | Available | Available |
| Certification harness | — | Installed | Uses harness + vendor sandbox | Available | Available | Available | Available | Available | Available |
| Production dispatch (D22) | **Blocked** | **Blocked** | **Blocked** | **Blocked** | **Blocked** | **Blocked** | **Blocked** | **Blocked** | **Blocked** |

## Provider keys (registry)

| Key | Role |
|-----|------|
| `disabled` | Default — no vendor |
| `kccc-sandbox` | Deterministic certification harness (no vendor network) |
| `kccc-test` | D21 unit-test adapter — **not selectable in production** |
| `resend` | Official D22 vendor adapter |
| `sendgrid` | Stub — not registered until implemented |
| `mailgun` | Stub |
| `postmark` | Stub |
| `amazon-ses` | Stub |
| `twilio` | Stub (SMS-primary) |
| `mailersend` | Stub |

## Selection notes (capabilities only)

| Vendor | Typical strength | Kelly consideration |
|--------|------------------|---------------------|
| Resend | Modern email API, simple webhooks | D22 reference implementation |
| SendGrid | Mature email, broad docs | Available stub |
| Mailgun | Email + some SMS | Available stub |
| Postmark | Transactional email focus | Available stub |
| Amazon SES | Cost at scale, AWS coupling | Available stub |
| Twilio | SMS + email (Verify etc.) | Available stub when SMS required |
| MailerSend | Email API competitor | Available stub |

**Mobilize is not listed** — not a communications provider candidate.

## Implementing an Available stub

1. Add adapter under `src/lib/missions/v21/communications/providers/`
2. Register in `provider-registry.ts`
3. Complete sandbox certification checklist
4. Update this matrix: **Available → Installed**

## Related

- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_ADAPTER_DEVELOPMENT_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_SELECTION_GUIDE.md`
