# KCCC — Campaign governance (D25)

Campaigns bind one channel, one approved composition revision, one approved recipient manifest, one provider mode, and one execution plan revision.

After approval, configuration changes require a new campaign revision and invalidate readiness/authorization.

Production mode is not grantable in D25. Controlled live tests use the separate D26 path (`LIVE_TEST_READY` + one-time authorization) and still do not enable general production campaigns.
