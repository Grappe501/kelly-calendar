# KCCC V2.1 — Communications link safety guide

**Scope:** Canonical link inspection (D23)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`

## Purpose

Extract, normalize, validate, and record every URL in composed content **before** approval and dispatch. Provider adapters **must not** rewrite links, add click tracking, or substitute destinations.

D23 identifies tracking eligibility for future deliverables — it does **not** implement click tracking or URL wrapping.

## Inspector responsibilities

1. Extract URLs from HTML `href`, plain text, and SMS body
2. Normalize (trim, decode safe encodings, reject ambiguous doubles)
3. Reject unsafe schemes
4. Classify internal vs external destinations
5. Flag localhost, `127.0.0.1`, and development hostnames
6. Flag missing HTTPS where policy requires TLS
7. Record anchor text (email HTML) and final URL in `linkManifestJson`
8. Surface operator review in composition workspace
9. Block hidden link substitution — rendered artifact hash includes manifest

## Blocked schemes (default)

`javascript:` · `data:` (except approved inline images if ever allowed) · `vbscript:` · `file:` · custom app schemes unless explicitly allowlisted.

## Warnings vs blocks

| Condition | Default severity |
|-----------|------------------|
| `http://` on public campaign link | Warning or block per profile |
| Localhost / staging URL in dispatch artifact | **Block** for `DISPATCH` |
| Mobilize URL not matching verified `ExternalObjectReference` | **Block** (aligns D20 `MOBILIZE_LINK_INVALID`) |
| Malformed URL | **Block** |
| Unresolved token in URL | **Block** |
| Link count exceeds policy threshold | Warning |

## Link manifest record shape (conceptual)

```text
urlNormalized
scheme
host
isExternal
anchorText (email)
sourceField (html | text | sms)
policyFlags[]
stableId (hash of normalized url + position)
```

Manifest is part of artifact integrity — adapter transport includes URLs only as rendered in artifact, byte-for-byte.

## Operator review UI

Composition workspace **Links** panel shows:

- Final URL (not redirect chain — D23 does not follow redirects)
- Anchor text vs displayed text mismatch warnings
- External domain list for quick scan
- Mobilize link verification status

## Provider adapter rule

Adapters receive `CanonicalProviderMessage` with finalized `html`, `text`, and SMS body. Adapters may map fields to vendor API shape but **must not**:

- Wrap URLs for tracking
- Inject additional links
- Replace Mobilize or CTA URLs
- Fetch link targets to mutate content

## Related

- `KCCC_V2_1_COMMUNICATIONS_RENDERING_AND_SANITIZATION.md`
- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_ARTIFACT_CONTRACT.md`
- D20 Mobilize external reference validation
