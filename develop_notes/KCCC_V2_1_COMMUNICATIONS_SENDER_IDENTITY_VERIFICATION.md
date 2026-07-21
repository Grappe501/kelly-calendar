# KCCC — Sender identity verification (D26)

Live tests bind to **one exact sender profile**. Client input cannot override sender identity.

## Email

- From-address verified  
- Sending domain verified  
- Reply-to valid  
- Display name approved  
- Return-path known  
- SPF / DKIM / DMARC surfaced  

## SMS

- Number or messaging service verified  
- Ownership/assignment verified  
- STOP / HELP handling verified  

Evidence stores masked identifiers and verification timestamps only.
