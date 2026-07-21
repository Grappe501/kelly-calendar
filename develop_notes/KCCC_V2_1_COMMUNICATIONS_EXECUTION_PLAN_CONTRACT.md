# KCCC — Execution plan contract (D25)

Execution plans define timezone, window, rate limits, retry/failure thresholds, and mode.

Only `MANUAL_SANDBOX` and `SCHEDULED_SANDBOX` may be approved.

Default conservative limits: max recipients 25, batch size 5, min delay between batches 30s.
