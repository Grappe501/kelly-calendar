# IC-02D Rollback

Prefer disable nav to `/system/volunteers`, `/system/work`, `/system/logistics`.

Destructive (authorized only):

```sql
DROP TABLE IF EXISTS "kelly_calendar"."CampaignTrainingCatalogItem";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignWorkItemIndex";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignVolunteerAssignment";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignVolunteerStatusHistory";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignVolunteerNote";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignVolunteerPreference";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignVolunteerTraining";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignVolunteerAvailability";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignVolunteerSkill";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignVolunteerInterest";
DROP TABLE IF EXISTS "kelly_calendar"."CampaignVolunteerProfile";
-- Optionally delete template install row for 1.1.0 and ACM/logistics positions
```
