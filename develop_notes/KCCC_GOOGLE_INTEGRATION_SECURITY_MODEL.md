# Google Integration Security Model

## OAuth

- Scope: `https://www.googleapis.com/auth/calendar.readonly`
- Offline access + PKCE + server-side state
- Owner / Campaign Manager only
- Refresh tokens encrypted AES-256-GCM at rest
- Encryption key: `KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY` (env only)
- Access tokens not persisted
- Never browser localStorage / client bundles / logs / git

## Routes

- Server-side `KCCC_GOOGLE_MAPS_ROUTES_API_KEY` only
- Restrict key to Routes API in Cloud Console
- No geometry storage in v1 legs

## Incident response

1. Disconnect in admin UI (revokes + destroys ciphertext)
2. Reset OAuth client secret / Routes key if exposed
3. Rotate `KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY` only with re-connect (old ciphertext unreadable)
4. Reset secret iCal address separately if that channel was used
