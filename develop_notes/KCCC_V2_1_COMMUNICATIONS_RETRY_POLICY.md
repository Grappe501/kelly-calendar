# KCCC — Retry policy (D25)

Classify failures: NON_RETRYABLE / RETRYABLE / REVIEW_REQUIRED / UNKNOWN.

Consent, suppression, invalid destination, revoked manifest/auth → non-retryable.

Default: operator approval required; max 1 retry; no infinite retries; no retry after window close without new authorization.
