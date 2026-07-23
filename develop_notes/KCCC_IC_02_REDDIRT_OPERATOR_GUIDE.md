# IC-02 RedDirt Operator Guide

## What this is

RedDirt supplies **read-only strategic geography context** (for example county priority tiers). Kelly Calendar does not write back to RedDirt in IC-02.

## Connection states

- **Not configured** — credentials missing. You can still run a **fixture dry-run** for training/tests.
- **Disabled** — `REDDIRT_READ_ENABLED` is off (default). No network calls.
- **Documentation pending** — official API docs not yet verified; live GET paths are not invented.
- **Verified** — only after a verified contract + successful read (not claimed without evidence).

## Typical workflow

1. Open **System → Integrations → RedDirt**.
2. Confirm read-only status and documentation state.
3. Run **fixture dry-run** (or upload an approved JSON/CSV export for preview).
4. Open the run · review exact vs ambiguous matches.
5. Apply only clear matches. Re-apply of the same fingerprint creates **zero duplicates**.
6. Inspect applied facts on **Strategic geography** or county detail badges (labeled **RedDirt-sourced**).

## What operators must not do

- Treat RedDirt scores as objective truth
- Expect person/volunteer contact import (denied)
- Expect Event or Mission changes from RedDirt
- Paste API keys into chat, screenshots, or tickets
