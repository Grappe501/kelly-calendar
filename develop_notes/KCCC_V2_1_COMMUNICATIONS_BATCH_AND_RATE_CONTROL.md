# KCCC — Batch & rate control (D25)

Batches are deterministic contiguous slices of ordered manifest entries.

Limits: batch size, run attempts, hourly attempts, campaign recipients, authorization caps, minimum inter-batch delay.

Do not materialize all attempts for a large campaign at once.
