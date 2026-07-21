# KCCC — Live-test incident response (D26)

## Model

`CommunicationLiveTestIncident` — severity `INFO` | `WARNING` | `HIGH` | `CRITICAL`

## Types (examples)

`PROVIDER_AUTH_FAILURE` · `UNEXPECTED_PROVIDER_SUBMISSION` · `DUPLICATE_SUBMISSION_RISK` · `WEBHOOK_SIGNATURE_FAILURE` · `WEBHOOK_REPLAY_ANOMALY` · `DESTINATION_MISMATCH` · `ARTIFACT_MISMATCH` · `CONSENT_FAILURE` · `SUPPRESSION_FAILURE` · `PRODUCTION_BLOCK_FAILURE` · `SECRET_EXPOSURE_RISK` · `UNKNOWN_PROVIDER_OUTCOME`

Critical incidents should activate or recommend the global communications kill switch. Unknown provider outcomes fail closed — no retry on the same authorization.
