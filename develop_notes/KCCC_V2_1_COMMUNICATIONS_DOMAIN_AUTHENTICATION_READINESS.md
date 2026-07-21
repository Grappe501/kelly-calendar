# KCCC — Domain authentication readiness (D26)

Extends D22 domain-verification workspace for live-test readiness.

## Checks

SPF · DKIM · DMARC · Return-Path · Tracking Domain · Reply-To Alignment · Provider Verification · DNS last checked / evidence age

## Launch policy (initial)

| Check | Policy |
|-------|--------|
| DKIM | Required |
| SPF | Required or provider-documented alignment equivalent |
| DMARC | Present and surfaced |
| Sender identity | Required |
| Provider domain verification | Required |

Do not falsely represent provider shared-domain verification as full independent deliverability certification. BIMI is optional and not required.
