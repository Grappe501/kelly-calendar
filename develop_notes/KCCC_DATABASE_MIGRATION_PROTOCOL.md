# Database Migration Protocol

1. `npm run db:classify`  
2. `npm run db:preflight`  
3. `npm run db:namespace:audit`  
4. `npm run db:migration:plan` + inspect SQL  
5. `npm run db:reddirt:snapshot -- before`  
6. `KCCC_ALLOW_SCHEMA_MIGRATION=1 npm run db:migration:apply`  
7. `npm run db:seed:reference`  
8. `npm run db:schema:verify`  
9. `npm run db:reddirt:snapshot -- after`  
10. Compare signatures  

Never `migrate reset` or `db push` on production.
