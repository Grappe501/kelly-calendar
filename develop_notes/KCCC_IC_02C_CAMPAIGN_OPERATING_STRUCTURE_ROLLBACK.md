# IC-02C Rollback

Prefer disable `/system/organization` nav. Destructive drop (authorized only):

```sql
DROP TABLE IF EXISTS "kelly_calendar"."CampaignCountyOrganizingAssessment";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignOrgAuditEvent";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignOrgDelegation";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignClusterCounty";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignOrgPositionAssignment";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignOrgPosition";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignOrgCluster";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignOrgFunction";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignOrgDepartment";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignOrgTemplateInstall";
```
