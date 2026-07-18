-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "kelly_calendar";

-- CreateEnum
CREATE TYPE "kelly_calendar"."CalendarType" AS ENUM ('COMMAND', 'CANDIDATE', 'TRAVEL', 'FUNDRAISING', 'PUBLIC_EVENTS', 'INTERNAL_MEETINGS', 'COMMUNICATIONS', 'SOCIAL_MEDIA', 'PRESS_MEDIA', 'FIELD', 'COUNTY_ACTIVITY', 'VOLUNTEER', 'COMPLIANCE', 'STAFF_WORK', 'DEBATE_PREP', 'SURROGATE', 'PROTECTED_PERSONAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "kelly_calendar"."CalendarAccessLevel" AS ENUM ('NO_ACCESS', 'AVAILABILITY_ONLY', 'VIEW_LIMITED', 'VIEW_FULL', 'CONTRIBUTE', 'EDIT', 'MANAGE', 'ADMINISTER');

-- CreateEnum
CREATE TYPE "kelly_calendar"."EventVisibilityLevel" AS ENUM ('FULL', 'LIMITED', 'TITLE_LOCATION', 'BUSY_WITH_CATEGORY', 'BUSY_ONLY', 'CAMPAIGN_AUTHENTICATED', 'TEAM_ONLY', 'LEADERSHIP_ONLY', 'NAMED_USERS', 'PUBLIC', 'PROTECTED');

-- CreateEnum
CREATE TYPE "kelly_calendar"."LocationDisclosure" AS ENUM ('EXACT', 'VENUE', 'CITY', 'COUNTY', 'REGION', 'HIDDEN');

-- CreateEnum
CREATE TYPE "kelly_calendar"."RollupMode" AS ENUM ('FULL_DETAIL', 'TITLE_LOCATION', 'BUSY_WITH_CATEGORY', 'BUSY_ONLY', 'MILESTONES_ONLY', 'REQUIRED_ACTIONS_ONLY', 'DO_NOT_ROLL_UP');

-- CreateEnum
CREATE TYPE "kelly_calendar"."EventStatus" AS ENUM ('DRAFT', 'REQUESTED', 'TENTATIVE', 'HOLD', 'UNDER_REVIEW', 'APPROVED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DECLINED', 'POSTPONED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "kelly_calendar"."HistoricalReviewStatus" AS ENUM ('UNREVIEWED', 'NEEDS_EDIT', 'NEEDS_CLASSIFICATION', 'APPROVED', 'REJECTED', 'MERGED', 'DUPLICATE', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "kelly_calendar"."ChecklistState" AS ENUM ('NOT_NEEDED', 'NEEDED', 'ASSIGNED', 'IN_PROGRESS', 'PACKED', 'LOADED', 'DELIVERED', 'COMPLETED', 'RETURNED', 'MISSING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "kelly_calendar"."TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'WAITING', 'READY_FOR_REVIEW', 'COMPLETE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "kelly_calendar"."ApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "kelly_calendar"."ExternalProvider" AS ENUM ('GOOGLE_CALENDAR', 'APPLE_CALENDAR', 'MICROSOFT_OUTLOOK', 'ICS', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "kelly_calendar"."SyncDirection" AS ENUM ('IMPORT_ONLY', 'EXPORT_ONLY', 'TWO_WAY', 'NONE');

-- CreateEnum
CREATE TYPE "kelly_calendar"."SyncStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'ACTIVE', 'PAUSED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "kelly_calendar"."EventMembershipType" AS ENUM ('PRIMARY', 'RELATED', 'GENERATED', 'REFERENCE');

-- CreateEnum
CREATE TYPE "kelly_calendar"."EventSection" AS ENUM ('BASIC', 'LOCATION', 'PARTICIPANTS', 'PRIVATE_NOTES', 'PROGRAM_FLOW', 'PACKING', 'STAFFING', 'TRAVEL', 'COMMUNICATIONS', 'SOCIAL_MEDIA', 'FUNDRAISING', 'COMPLIANCE', 'SECURITY', 'FILES', 'FOLLOWUP', 'OUTCOMES', 'AUDIT', 'AI_SUGGESTIONS');

-- CreateEnum
CREATE TYPE "kelly_calendar"."VisibilityTargetType" AS ENUM ('USER', 'TEAM', 'ROLE', 'CALENDAR_MEMBER', 'AUTHENTICATED_CAMPAIGN', 'PUBLIC');

-- CreateEnum
CREATE TYPE "kelly_calendar"."ActionPhase" AS ENUM ('PRE_EVENT', 'EVENT_DAY', 'POST_EVENT', 'TRAVEL', 'COMMUNICATIONS', 'COMPLIANCE', 'FOLLOWUP');

-- CreateEnum
CREATE TYPE "kelly_calendar"."StaffRoleType" AS ENUM ('EVENT_LEAD', 'CANDIDATE_LEAD', 'ADVANCE_LEAD', 'TRAVEL_LEAD', 'DRIVER', 'COMMUNICATIONS_LEAD', 'PRESS_LIAISON', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'VOLUNTEER_LEAD', 'FINANCE_LEAD', 'COMPLIANCE_LEAD', 'SECURITY_LEAD', 'FOLLOWUP_OWNER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "kelly_calendar"."PackingCategory" AS ENUM ('CAMPAIGN_MATERIAL', 'CANDIDATE_MATERIAL', 'TECHNOLOGY', 'SIGNAGE', 'VOLUNTEER', 'HOSPITALITY', 'WEATHER', 'SAFETY', 'PERSONAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "kelly_calendar"."FlowActivityType" AS ENUM ('ARRIVAL', 'HOST_GREETING', 'PRIVATE_BRIEFING', 'LEADERSHIP_MEETING', 'PHOTO_LINE', 'CANDIDATE_REMARKS', 'QUESTIONS', 'MEDIA_AVAILABILITY', 'VOLUNTEER_GREETING', 'MEAL', 'TRAVEL_TRANSITION', 'DEPARTURE', 'FOLLOWUP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "kelly_calendar"."ObjectiveType" AS ENUM ('BUILD_RELATIONSHIPS', 'EARN_MEDIA', 'RECRUIT_VOLUNTEERS', 'RAISE_MONEY', 'MEET_VOTERS', 'REACH_TARGET_AUDIENCE', 'SUPPORT_ORGANIZATION', 'DELIVER_MESSAGE', 'GATHER_INFORMATION', 'PREPARE_CANDIDATE', 'COMPLIANCE', 'CREATE_CONTENT', 'INTERNAL_COORDINATION', 'OTHER');

-- CreateEnum
CREATE TYPE "kelly_calendar"."CommChannel" AS ENUM ('EMAIL', 'SMS', 'WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'X', 'TIKTOK', 'YOUTUBE', 'PRESS', 'PRINT', 'INTERNAL', 'OTHER');

-- CreateEnum
CREATE TYPE "kelly_calendar"."CommType" AS ENUM ('ANNOUNCEMENT', 'PROMOTION', 'REMINDER', 'PRESS_ADVISORY', 'PRESS_RELEASE', 'TALKING_POINTS', 'SPEECH', 'LIVESTREAM', 'PHOTO', 'VIDEO', 'RECAP', 'THANK_YOU', 'RAPID_RESPONSE', 'OTHER');

-- CreateEnum
CREATE TYPE "kelly_calendar"."TravelSegmentType" AS ENUM ('DRIVE', 'FLIGHT', 'TRAIN', 'WALK', 'RIDESHARE', 'RENTAL', 'HOTEL', 'OTHER');

-- CreateEnum
CREATE TYPE "kelly_calendar"."PersonEventRole" AS ENUM ('HOST', 'PRIMARY_CONTACT', 'ATTENDEE', 'INTRODUCER', 'SPEAKER', 'MEDIA', 'ELECTED_OFFICIAL', 'DONOR', 'VOLUNTEER', 'STAFF', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "kelly_calendar"."DuplicateStatus" AS ENUM ('NEW', 'EXACT_DUPLICATE', 'LIKELY_DUPLICATE', 'POSSIBLE_DUPLICATE', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "kelly_calendar"."ImportRunStatus" AS ENUM ('STARTED', 'FETCHED', 'NORMALIZED', 'STAGED', 'PARTIAL', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "kelly_calendar"."AiSuggestionDecisionType" AS ENUM ('ACCEPTED', 'REJECTED', 'MODIFIED', 'IGNORED');

-- CreateEnum
CREATE TYPE "kelly_calendar"."ColorToken" AS ENUM ('candidate', 'travel', 'fundraising', 'events', 'communications', 'social', 'press', 'field', 'county', 'volunteer', 'compliance', 'staff', 'personal', 'command');

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystemGroup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."Calendar" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "calendarType" "kelly_calendar"."CalendarType" NOT NULL,
    "calendarGroupId" TEXT,
    "ownerUserId" TEXT,
    "managingTeamId" TEXT,
    "isSystemCalendar" BOOLEAN NOT NULL DEFAULT false,
    "isCommandCalendar" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultVisibility" "kelly_calendar"."EventVisibilityLevel" NOT NULL DEFAULT 'TITLE_LOCATION',
    "defaultLocationDisclosure" "kelly_calendar"."LocationDisclosure" NOT NULL DEFAULT 'CITY',
    "defaultRollupMode" "kelly_calendar"."RollupMode" NOT NULL DEFAULT 'TITLE_LOCATION',
    "defaultEventDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "allowsPublicEvents" BOOLEAN NOT NULL DEFAULT false,
    "allowsExternalImport" BOOLEAN NOT NULL DEFAULT true,
    "allowsExternalExport" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowsDirectEventCreation" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "displayColorToken" "kelly_calendar"."ColorToken" NOT NULL DEFAULT 'events',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarMembership" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" "kelly_calendar"."CalendarAccessLevel" NOT NULL DEFAULT 'NO_ACCESS',
    "canViewParticipants" BOOLEAN NOT NULL DEFAULT false,
    "canViewNotes" BOOLEAN NOT NULL DEFAULT false,
    "canViewFiles" BOOLEAN NOT NULL DEFAULT false,
    "canViewTravelDetails" BOOLEAN NOT NULL DEFAULT false,
    "canViewCommunicationsPlan" BOOLEAN NOT NULL DEFAULT false,
    "canViewFundraisingDetails" BOOLEAN NOT NULL DEFAULT false,
    "canViewSecurityDetails" BOOLEAN NOT NULL DEFAULT false,
    "canCreateEvents" BOOLEAN NOT NULL DEFAULT false,
    "canEditEvents" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteEvents" BOOLEAN NOT NULL DEFAULT false,
    "canManageMemberships" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "grantedByUserId" TEXT,
    "grantReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,

    CONSTRAINT "CalendarMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarTeamBinding" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "accessLevel" "kelly_calendar"."CalendarAccessLevel" NOT NULL DEFAULT 'VIEW_LIMITED',
    "sectionPermissions" JSONB,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarTeamBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarRollupRule" (
    "id" TEXT NOT NULL,
    "sourceCalendarId" TEXT NOT NULL,
    "targetCalendarId" TEXT NOT NULL,
    "rollupMode" "kelly_calendar"."RollupMode" NOT NULL DEFAULT 'TITLE_LOCATION',
    "includeTentative" BOOLEAN NOT NULL DEFAULT true,
    "includeCancelled" BOOLEAN NOT NULL DEFAULT false,
    "includeCompleted" BOOLEAN NOT NULL DEFAULT true,
    "includeTasks" BOOLEAN NOT NULL DEFAULT false,
    "includeMilestones" BOOLEAN NOT NULL DEFAULT true,
    "includeLocation" BOOLEAN NOT NULL DEFAULT true,
    "includeSafeTitle" BOOLEAN NOT NULL DEFAULT true,
    "includeCalendarName" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarRollupRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarSavedView" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "isSystemView" BOOLEAN NOT NULL DEFAULT false,
    "sharedWithTeamId" TEXT,
    "dateRangeMode" TEXT,
    "viewMode" TEXT,
    "filtersJson" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarViewLayer" (
    "id" TEXT NOT NULL,
    "savedViewId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "displayMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarViewLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventNumberCounter" (
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EventNumberCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."Event" (
    "id" TEXT NOT NULL,
    "eventNumber" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdByUserId" TEXT,
    "ownerUserId" TEXT,
    "primaryCalendarId" TEXT NOT NULL,
    "templateId" TEXT,
    "internalTitle" TEXT NOT NULL,
    "campaignDisplayTitle" TEXT NOT NULL,
    "restrictedDisplayTitle" TEXT,
    "publicTitle" TEXT,
    "eventType" TEXT,
    "eventSubtype" TEXT,
    "status" "kelly_calendar"."EventStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "confirmationSource" TEXT,
    "confirmationStatus" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "isMultiDay" BOOLEAN NOT NULL DEFAULT false,
    "arrivalAt" TIMESTAMP(3),
    "departureAt" TIMESTAMP(3),
    "setupStartsAt" TIMESTAMP(3),
    "breakdownEndsAt" TIMESTAMP(3),
    "defaultVisibility" "kelly_calendar"."EventVisibilityLevel" NOT NULL DEFAULT 'TITLE_LOCATION',
    "locationDisclosure" "kelly_calendar"."LocationDisclosure" NOT NULL DEFAULT 'CITY',
    "sensitivityLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "venueName" TEXT,
    "streetAddress" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "countyId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Arkansas',
    "postalCode" TEXT,
    "regionId" TEXT,
    "locationNotes" TEXT,
    "virtualMeetingUrl" TEXT,
    "mapUrl" TEXT,
    "publicDescription" TEXT,
    "campaignDescription" TEXT,
    "privateNotes" TEXT,
    "candidateAttendance" BOOLEAN,
    "candidateRole" TEXT,
    "expectedAttendance" INTEGER,
    "actualAttendance" INTEGER,
    "historicalReviewStatus" "kelly_calendar"."HistoricalReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "historicalAttendanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "historicalOccurredConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "historicalReviewedByUserId" TEXT,
    "historicalReviewedAt" TIMESTAMP(3),
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceSeriesId" TEXT,
    "recurrenceRule" TEXT,
    "originalOccurrenceAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedByUserId" TEXT,
    "archiveReason" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventCalendarMembership" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "membershipType" "kelly_calendar"."EventMembershipType" NOT NULL DEFAULT 'RELATED',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "rollupOverride" "kelly_calendar"."RollupMode",
    "visibilityOverride" "kelly_calendar"."EventVisibilityLevel",
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "EventCalendarMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventVisibilityOverride" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "targetType" "kelly_calendar"."VisibilityTargetType" NOT NULL,
    "targetUserId" TEXT,
    "targetTeamId" TEXT,
    "targetRole" TEXT,
    "visibilityLevel" "kelly_calendar"."EventVisibilityLevel" NOT NULL,
    "locationDisclosure" "kelly_calendar"."LocationDisclosure",
    "canOpen" BOOLEAN NOT NULL DEFAULT false,
    "canViewParticipants" BOOLEAN NOT NULL DEFAULT false,
    "canViewNotes" BOOLEAN NOT NULL DEFAULT false,
    "canViewFiles" BOOLEAN NOT NULL DEFAULT false,
    "canViewTravelDetails" BOOLEAN NOT NULL DEFAULT false,
    "canViewCommunications" BOOLEAN NOT NULL DEFAULT false,
    "canViewFundraising" BOOLEAN NOT NULL DEFAULT false,
    "canViewSecurity" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "EventVisibilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventSectionPermission" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "section" "kelly_calendar"."EventSection" NOT NULL,
    "targetType" "kelly_calendar"."VisibilityTargetType" NOT NULL,
    "targetUserId" TEXT,
    "targetTeamId" TEXT,
    "targetRole" TEXT,
    "accessLevel" "kelly_calendar"."CalendarAccessLevel" NOT NULL DEFAULT 'NO_ACCESS',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "EventSectionPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventStatusHistory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fromStatus" "kelly_calendar"."EventStatus",
    "toStatus" "kelly_calendar"."EventStatus" NOT NULL,
    "changedByUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventTag" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "EventTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventObjective" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "objectiveType" "kelly_calendar"."ObjectiveType" NOT NULL DEFAULT 'OTHER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "successDefinition" TEXT,
    "targetAudience" TEXT,
    "desiredOutcome" TEXT,
    "priority" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventProgramFlowItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "activityType" "kelly_calendar"."FlowActivityType" NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsibleUserId" TEXT,
    "responsibleTeamId" TEXT,
    "locationLabel" TEXT,
    "candidateAction" TEXT,
    "requiredMaterials" TEXT,
    "status" "kelly_calendar"."TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EventProgramFlowItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventPackingItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "templateItemId" TEXT,
    "category" "kelly_calendar"."PackingCategory" NOT NULL DEFAULT 'CUSTOM',
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "state" "kelly_calendar"."ChecklistState" NOT NULL DEFAULT 'NEEDED',
    "assignedUserId" TEXT,
    "assignedTeamId" TEXT,
    "neededBy" TIMESTAMP(3),
    "packedAt" TIMESTAMP(3),
    "loadedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPackingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventActionItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "phase" "kelly_calendar"."ActionPhase" NOT NULL,
    "actionType" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedUserId" TEXT,
    "assignedTeamId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "kelly_calendar"."TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalRequestId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventStaffAssignment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "roleType" "kelly_calendar"."StaffRoleType" NOT NULL,
    "assignedUserId" TEXT,
    "assignedTeamId" TEXT,
    "status" "kelly_calendar"."TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "instructions" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventStaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventCommunicationsItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "channel" "kelly_calendar"."CommChannel" NOT NULL,
    "communicationType" "kelly_calendar"."CommType" NOT NULL DEFAULT 'OTHER',
    "audience" TEXT,
    "objective" TEXT,
    "ownerUserId" TEXT,
    "ownerTeamId" TEXT,
    "draftDueAt" TIMESTAMP(3),
    "approvalDueAt" TIMESTAMP(3),
    "publishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "kelly_calendar"."TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "approvalStatus" "kelly_calendar"."ApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "assetUrl" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCommunicationsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventTravelPlan" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "travelRequired" BOOLEAN NOT NULL DEFAULT false,
    "originPlaceId" TEXT,
    "destinationPlaceId" TEXT,
    "departureAt" TIMESTAMP(3),
    "targetArrivalAt" TIMESTAMP(3),
    "estimatedDurationMinutes" INTEGER,
    "bufferMinutes" INTEGER,
    "estimatedDistanceMiles" DOUBLE PRECISION,
    "driverUserId" TEXT,
    "vehicleDescription" TEXT,
    "rentalRequired" BOOLEAN NOT NULL DEFAULT false,
    "flightRequired" BOOLEAN NOT NULL DEFAULT false,
    "lodgingRequired" BOOLEAN NOT NULL DEFAULT false,
    "overnightStay" BOOLEAN NOT NULL DEFAULT false,
    "parkingInstructions" TEXT,
    "mealPlan" TEXT,
    "weatherConcern" TEXT,
    "securitySensitive" BOOLEAN NOT NULL DEFAULT false,
    "returnPlan" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTravelPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventTravelSegment" (
    "id" TEXT NOT NULL,
    "travelPlanId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "segmentType" "kelly_calendar"."TravelSegmentType" NOT NULL DEFAULT 'DRIVE',
    "originLabel" TEXT,
    "destinationLabel" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "distanceMiles" DOUBLE PRECISION,
    "provider" TEXT,
    "confirmationReferenceEncrypted" TEXT,
    "status" "kelly_calendar"."TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTravelSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventBriefing" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventFile" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "contentType" TEXT,
    "sensitivity" TEXT NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventNote" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'PRIVATE',
    "body" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventOutcome" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "summary" TEXT,
    "lessons" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventFollowup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "kelly_calendar"."TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFollowup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."Person" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "preferredName" TEXT,
    "title" TEXT,
    "organizationId" TEXT,
    "publicEmail" TEXT,
    "privateEmailEncrypted" TEXT,
    "publicPhone" TEXT,
    "privatePhoneEncrypted" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationType" TEXT,
    "websiteUrl" TEXT,
    "city" TEXT,
    "countyId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Arkansas',
    "externalCrmId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventPerson" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "kelly_calendar"."PersonEventRole" NOT NULL DEFAULT 'OTHER',

    CONSTRAINT "EventPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventOrganization" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HOST',

    CONSTRAINT "EventOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ContactMethod" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ContactMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ArkansasRegion" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ArkansasRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ArkansasCounty" (
    "id" TEXT NOT NULL,
    "fipsCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "regionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ArkansasCounty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placeType" TEXT,
    "venueName" TEXT,
    "streetAddress" TEXT,
    "city" TEXT,
    "countyId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Arkansas',
    "postalCode" TEXT,
    "regionId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationDisclosureDefault" "kelly_calendar"."LocationDisclosure" NOT NULL DEFAULT 'CITY',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventGeography" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "countyId" TEXT,
    "placeId" TEXT,

    CONSTRAINT "EventGeography_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ExternalCalendarSource" (
    "id" TEXT NOT NULL,
    "provider" "kelly_calendar"."ExternalProvider" NOT NULL DEFAULT 'GOOGLE_CALENDAR',
    "sourceType" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "externalCalendarIdEncrypted" TEXT,
    "sourceUrlEncrypted" TEXT,
    "syncDirection" "kelly_calendar"."SyncDirection" NOT NULL DEFAULT 'IMPORT_ONLY',
    "syncStatus" "kelly_calendar"."SyncStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "historicalFloor" TIMESTAMP(3) NOT NULL,
    "lastSuccessfulImportAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorSummary" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "ExternalCalendarSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarImportRun" (
    "id" TEXT NOT NULL,
    "externalSourceId" TEXT NOT NULL,
    "requestedStart" TIMESTAMP(3) NOT NULL,
    "requestedEnd" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "kelly_calendar"."ImportRunStatus" NOT NULL DEFAULT 'STARTED',
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "parsedCount" INTEGER NOT NULL DEFAULT 0,
    "normalizedCount" INTEGER NOT NULL DEFAULT 0,
    "stagedCount" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "manifestJson" JSONB,
    "operatorUserId" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarImportRecord" (
    "id" TEXT NOT NULL,
    "importRunId" TEXT NOT NULL,
    "externalEventIdentityId" TEXT,
    "rawFingerprint" TEXT NOT NULL,
    "normalizedPayload" JSONB,
    "proposedEventPayload" JSONB,
    "reviewStatus" "kelly_calendar"."HistoricalReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "duplicateStatus" "kelly_calendar"."DuplicateStatus" NOT NULL DEFAULT 'NEW',
    "canonicalEventId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarImportDuplicateMatch" (
    "id" TEXT NOT NULL,
    "importRecordId" TEXT NOT NULL,
    "matchedRecordId" TEXT,
    "status" "kelly_calendar"."DuplicateStatus" NOT NULL,
    "reasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarImportDuplicateMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."CalendarImportReviewAction" (
    "id" TEXT NOT NULL,
    "importRecordId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarImportReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ExternalEventIdentity" (
    "id" TEXT NOT NULL,
    "provider" "kelly_calendar"."ExternalProvider" NOT NULL DEFAULT 'GOOGLE_CALENDAR',
    "externalSourceId" TEXT NOT NULL,
    "externalEventId" TEXT,
    "iCalUid" TEXT,
    "recurringEventId" TEXT,
    "originalOccurrenceAt" TIMESTAMP(3),
    "sourceSequence" INTEGER,
    "sourceUpdatedAt" TIMESTAMP(3),
    "canonicalEventId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExternalEventIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "primaryCalendarType" "kelly_calendar"."CalendarType" NOT NULL,
    "eventType" TEXT,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "defaultVisibility" "kelly_calendar"."EventVisibilityLevel" NOT NULL DEFAULT 'TITLE_LOCATION',
    "defaultLocationDisclosure" "kelly_calendar"."LocationDisclosure" NOT NULL DEFAULT 'CITY',
    "requiresTravelQuestions" BOOLEAN NOT NULL DEFAULT false,
    "requiresCommunicationsPlan" BOOLEAN NOT NULL DEFAULT false,
    "requiresComplianceReview" BOOLEAN NOT NULL DEFAULT false,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "snapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventTemplateSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "EventTemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."PackingTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."PackingTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "category" "kelly_calendar"."PackingCategory" NOT NULL DEFAULT 'CAMPAIGN_MATERIAL',
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PackingTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ProgramFlowTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramFlowTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ProgramFlowTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "activityType" "kelly_calendar"."FlowActivityType" NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,

    CONSTRAINT "ProgramFlowTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ActionTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ActionTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "phase" "kelly_calendar"."ActionPhase" NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "ActionTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ApprovalRequest" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "approvalType" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "assignedToUserId" TEXT,
    "assignedToTeamId" TEXT,
    "status" "kelly_calendar"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."ApprovalAction" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'USER',
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "requestId" TEXT,
    "source" TEXT,
    "reason" TEXT,
    "previousStateRedacted" JSONB,
    "newStateRedacted" JSONB,
    "metadataRedacted" JSONB,
    "ipHash" TEXT,
    "userAgentSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."DataAccessLog" (
    "id" TEXT NOT NULL,
    "viewerUserId" TEXT,
    "eventId" TEXT,
    "section" "kelly_calendar"."EventSection" NOT NULL,
    "accessResult" TEXT NOT NULL,
    "reasonCode" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."AiSuggestionRun" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "draftId" TEXT,
    "suggestionType" TEXT NOT NULL,
    "modelProvider" TEXT,
    "modelName" TEXT,
    "inputFingerprint" TEXT,
    "policyVersion" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DISABLED',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSuggestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."AiFieldSuggestion" (
    "id" TEXT NOT NULL,
    "suggestionRunId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "suggestedValue" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasonSummary" TEXT,
    "evidenceSummary" TEXT,
    "requiresHumanApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFieldSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."AiSuggestionDecision" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "decision" "kelly_calendar"."AiSuggestionDecisionType" NOT NULL,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedValue" JSONB,
    "decisionNote" TEXT,

    CONSTRAINT "AiSuggestionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelly_calendar"."EventPatternSignal" (
    "id" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "signalValue" JSONB,
    "sourceEventId" TEXT,
    "reviewedOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPatternSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarGroup_slug_key" ON "kelly_calendar"."CalendarGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Calendar_slug_key" ON "kelly_calendar"."Calendar"("slug");

-- CreateIndex
CREATE INDEX "Calendar_calendarType_idx" ON "kelly_calendar"."Calendar"("calendarType");

-- CreateIndex
CREATE INDEX "Calendar_isCommandCalendar_idx" ON "kelly_calendar"."Calendar"("isCommandCalendar");

-- CreateIndex
CREATE INDEX "CalendarMembership_userId_idx" ON "kelly_calendar"."CalendarMembership"("userId");

-- CreateIndex
CREATE INDEX "CalendarMembership_calendarId_idx" ON "kelly_calendar"."CalendarMembership"("calendarId");

-- CreateIndex
CREATE INDEX "CalendarMembership_userId_calendarId_revokedAt_idx" ON "kelly_calendar"."CalendarMembership"("userId", "calendarId", "revokedAt");

-- CreateIndex
CREATE INDEX "CalendarTeamBinding_teamId_idx" ON "kelly_calendar"."CalendarTeamBinding"("teamId");

-- CreateIndex
CREATE INDEX "CalendarTeamBinding_calendarId_idx" ON "kelly_calendar"."CalendarTeamBinding"("calendarId");

-- CreateIndex
CREATE INDEX "CalendarRollupRule_targetCalendarId_idx" ON "kelly_calendar"."CalendarRollupRule"("targetCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_eventNumber_key" ON "kelly_calendar"."Event"("eventNumber");

-- CreateIndex
CREATE INDEX "Event_startsAt_endsAt_idx" ON "kelly_calendar"."Event"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "kelly_calendar"."Event"("status");

-- CreateIndex
CREATE INDEX "Event_primaryCalendarId_idx" ON "kelly_calendar"."Event"("primaryCalendarId");

-- CreateIndex
CREATE INDEX "Event_countyId_idx" ON "kelly_calendar"."Event"("countyId");

-- CreateIndex
CREATE INDEX "Event_ownerUserId_idx" ON "kelly_calendar"."Event"("ownerUserId");

-- CreateIndex
CREATE INDEX "Event_historicalReviewStatus_idx" ON "kelly_calendar"."Event"("historicalReviewStatus");

-- CreateIndex
CREATE INDEX "Event_archivedAt_idx" ON "kelly_calendar"."Event"("archivedAt");

-- CreateIndex
CREATE INDEX "EventCalendarMembership_calendarId_idx" ON "kelly_calendar"."EventCalendarMembership"("calendarId");

-- CreateIndex
CREATE INDEX "EventCalendarMembership_eventId_idx" ON "kelly_calendar"."EventCalendarMembership"("eventId");

-- CreateIndex
CREATE INDEX "EventVisibilityOverride_eventId_idx" ON "kelly_calendar"."EventVisibilityOverride"("eventId");

-- CreateIndex
CREATE INDEX "EventSectionPermission_eventId_section_idx" ON "kelly_calendar"."EventSectionPermission"("eventId", "section");

-- CreateIndex
CREATE INDEX "EventStatusHistory_eventId_idx" ON "kelly_calendar"."EventStatusHistory"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "kelly_calendar"."Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventTag_eventId_tagId_key" ON "kelly_calendar"."EventTag"("eventId", "tagId");

-- CreateIndex
CREATE INDEX "EventObjective_eventId_idx" ON "kelly_calendar"."EventObjective"("eventId");

-- CreateIndex
CREATE INDEX "EventProgramFlowItem_eventId_sequence_idx" ON "kelly_calendar"."EventProgramFlowItem"("eventId", "sequence");

-- CreateIndex
CREATE INDEX "EventPackingItem_eventId_idx" ON "kelly_calendar"."EventPackingItem"("eventId");

-- CreateIndex
CREATE INDEX "EventActionItem_assignedUserId_idx" ON "kelly_calendar"."EventActionItem"("assignedUserId");

-- CreateIndex
CREATE INDEX "EventActionItem_assignedTeamId_idx" ON "kelly_calendar"."EventActionItem"("assignedTeamId");

-- CreateIndex
CREATE INDEX "EventActionItem_dueAt_idx" ON "kelly_calendar"."EventActionItem"("dueAt");

-- CreateIndex
CREATE INDEX "EventActionItem_status_idx" ON "kelly_calendar"."EventActionItem"("status");

-- CreateIndex
CREATE INDEX "EventActionItem_eventId_phase_idx" ON "kelly_calendar"."EventActionItem"("eventId", "phase");

-- CreateIndex
CREATE INDEX "EventStaffAssignment_eventId_idx" ON "kelly_calendar"."EventStaffAssignment"("eventId");

-- CreateIndex
CREATE INDEX "EventCommunicationsItem_publishAt_idx" ON "kelly_calendar"."EventCommunicationsItem"("publishAt");

-- CreateIndex
CREATE INDEX "EventCommunicationsItem_status_idx" ON "kelly_calendar"."EventCommunicationsItem"("status");

-- CreateIndex
CREATE INDEX "EventCommunicationsItem_eventId_idx" ON "kelly_calendar"."EventCommunicationsItem"("eventId");

-- CreateIndex
CREATE INDEX "EventTravelPlan_eventId_idx" ON "kelly_calendar"."EventTravelPlan"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPerson_eventId_personId_role_key" ON "kelly_calendar"."EventPerson"("eventId", "personId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "EventOrganization_eventId_organizationId_key" ON "kelly_calendar"."EventOrganization"("eventId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ArkansasRegion_slug_key" ON "kelly_calendar"."ArkansasRegion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ArkansasCounty_fipsCode_key" ON "kelly_calendar"."ArkansasCounty"("fipsCode");

-- CreateIndex
CREATE UNIQUE INDEX "ArkansasCounty_slug_key" ON "kelly_calendar"."ArkansasCounty"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarSource_sourceFingerprint_key" ON "kelly_calendar"."ExternalCalendarSource"("sourceFingerprint");

-- CreateIndex
CREATE INDEX "CalendarImportRun_status_idx" ON "kelly_calendar"."CalendarImportRun"("status");

-- CreateIndex
CREATE INDEX "CalendarImportRecord_reviewStatus_idx" ON "kelly_calendar"."CalendarImportRecord"("reviewStatus");

-- CreateIndex
CREATE INDEX "CalendarImportRecord_duplicateStatus_idx" ON "kelly_calendar"."CalendarImportRecord"("duplicateStatus");

-- CreateIndex
CREATE INDEX "ExternalEventIdentity_externalSourceId_externalEventId_idx" ON "kelly_calendar"."ExternalEventIdentity"("externalSourceId", "externalEventId");

-- CreateIndex
CREATE INDEX "ExternalEventIdentity_iCalUid_idx" ON "kelly_calendar"."ExternalEventIdentity"("iCalUid");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalEventIdentity_externalSourceId_fingerprint_key" ON "kelly_calendar"."ExternalEventIdentity"("externalSourceId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "EventTemplate_slug_key" ON "kelly_calendar"."EventTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PackingTemplate_slug_key" ON "kelly_calendar"."PackingTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramFlowTemplate_slug_key" ON "kelly_calendar"."ProgramFlowTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ActionTemplate_slug_key" ON "kelly_calendar"."ActionTemplate"("slug");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "kelly_calendar"."ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "kelly_calendar"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "kelly_calendar"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DataAccessLog_eventId_idx" ON "kelly_calendar"."DataAccessLog"("eventId");

-- CreateIndex
CREATE INDEX "EventPatternSignal_signalKey_idx" ON "kelly_calendar"."EventPatternSignal"("signalKey");

-- AddForeignKey
ALTER TABLE "kelly_calendar"."Calendar" ADD CONSTRAINT "Calendar_calendarGroupId_fkey" FOREIGN KEY ("calendarGroupId") REFERENCES "kelly_calendar"."CalendarGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarMembership" ADD CONSTRAINT "CalendarMembership_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "kelly_calendar"."Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarTeamBinding" ADD CONSTRAINT "CalendarTeamBinding_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "kelly_calendar"."Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarRollupRule" ADD CONSTRAINT "CalendarRollupRule_sourceCalendarId_fkey" FOREIGN KEY ("sourceCalendarId") REFERENCES "kelly_calendar"."Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarRollupRule" ADD CONSTRAINT "CalendarRollupRule_targetCalendarId_fkey" FOREIGN KEY ("targetCalendarId") REFERENCES "kelly_calendar"."Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarViewLayer" ADD CONSTRAINT "CalendarViewLayer_savedViewId_fkey" FOREIGN KEY ("savedViewId") REFERENCES "kelly_calendar"."CalendarSavedView"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarViewLayer" ADD CONSTRAINT "CalendarViewLayer_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "kelly_calendar"."Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."Event" ADD CONSTRAINT "Event_primaryCalendarId_fkey" FOREIGN KEY ("primaryCalendarId") REFERENCES "kelly_calendar"."Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."Event" ADD CONSTRAINT "Event_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."Event" ADD CONSTRAINT "Event_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "kelly_calendar"."ArkansasRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."Event" ADD CONSTRAINT "Event_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "kelly_calendar"."EventTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventCalendarMembership" ADD CONSTRAINT "EventCalendarMembership_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventCalendarMembership" ADD CONSTRAINT "EventCalendarMembership_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "kelly_calendar"."Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventVisibilityOverride" ADD CONSTRAINT "EventVisibilityOverride_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventSectionPermission" ADD CONSTRAINT "EventSectionPermission_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventStatusHistory" ADD CONSTRAINT "EventStatusHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventTag" ADD CONSTRAINT "EventTag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventTag" ADD CONSTRAINT "EventTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "kelly_calendar"."Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventObjective" ADD CONSTRAINT "EventObjective_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventProgramFlowItem" ADD CONSTRAINT "EventProgramFlowItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventPackingItem" ADD CONSTRAINT "EventPackingItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventActionItem" ADD CONSTRAINT "EventActionItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventStaffAssignment" ADD CONSTRAINT "EventStaffAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventCommunicationsItem" ADD CONSTRAINT "EventCommunicationsItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventTravelPlan" ADD CONSTRAINT "EventTravelPlan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventTravelSegment" ADD CONSTRAINT "EventTravelSegment_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "kelly_calendar"."EventTravelPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventBriefing" ADD CONSTRAINT "EventBriefing_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventLink" ADD CONSTRAINT "EventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventFile" ADD CONSTRAINT "EventFile_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventNote" ADD CONSTRAINT "EventNote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventOutcome" ADD CONSTRAINT "EventOutcome_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventFollowup" ADD CONSTRAINT "EventFollowup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."Person" ADD CONSTRAINT "Person_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "kelly_calendar"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."Organization" ADD CONSTRAINT "Organization_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventPerson" ADD CONSTRAINT "EventPerson_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventPerson" ADD CONSTRAINT "EventPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "kelly_calendar"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventOrganization" ADD CONSTRAINT "EventOrganization_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventOrganization" ADD CONSTRAINT "EventOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "kelly_calendar"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."ContactMethod" ADD CONSTRAINT "ContactMethod_personId_fkey" FOREIGN KEY ("personId") REFERENCES "kelly_calendar"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."ArkansasCounty" ADD CONSTRAINT "ArkansasCounty_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "kelly_calendar"."ArkansasRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."Place" ADD CONSTRAINT "Place_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."Place" ADD CONSTRAINT "Place_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "kelly_calendar"."ArkansasRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventGeography" ADD CONSTRAINT "EventGeography_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventGeography" ADD CONSTRAINT "EventGeography_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventGeography" ADD CONSTRAINT "EventGeography_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "kelly_calendar"."Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarImportRun" ADD CONSTRAINT "CalendarImportRun_externalSourceId_fkey" FOREIGN KEY ("externalSourceId") REFERENCES "kelly_calendar"."ExternalCalendarSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarImportRecord" ADD CONSTRAINT "CalendarImportRecord_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "kelly_calendar"."CalendarImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarImportRecord" ADD CONSTRAINT "CalendarImportRecord_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarImportDuplicateMatch" ADD CONSTRAINT "CalendarImportDuplicateMatch_importRecordId_fkey" FOREIGN KEY ("importRecordId") REFERENCES "kelly_calendar"."CalendarImportRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarImportDuplicateMatch" ADD CONSTRAINT "CalendarImportDuplicateMatch_matchedRecordId_fkey" FOREIGN KEY ("matchedRecordId") REFERENCES "kelly_calendar"."CalendarImportRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."CalendarImportReviewAction" ADD CONSTRAINT "CalendarImportReviewAction_importRecordId_fkey" FOREIGN KEY ("importRecordId") REFERENCES "kelly_calendar"."CalendarImportRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."ExternalEventIdentity" ADD CONSTRAINT "ExternalEventIdentity_externalSourceId_fkey" FOREIGN KEY ("externalSourceId") REFERENCES "kelly_calendar"."ExternalCalendarSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."ExternalEventIdentity" ADD CONSTRAINT "ExternalEventIdentity_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."EventTemplateSection" ADD CONSTRAINT "EventTemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "kelly_calendar"."EventTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."PackingTemplateItem" ADD CONSTRAINT "PackingTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "kelly_calendar"."PackingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."ProgramFlowTemplateItem" ADD CONSTRAINT "ProgramFlowTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "kelly_calendar"."ProgramFlowTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."ActionTemplateItem" ADD CONSTRAINT "ActionTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "kelly_calendar"."ActionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."ApprovalAction" ADD CONSTRAINT "ApprovalAction_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "kelly_calendar"."ApprovalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."DataAccessLog" ADD CONSTRAINT "DataAccessLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."AiSuggestionRun" ADD CONSTRAINT "AiSuggestionRun_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."AiFieldSuggestion" ADD CONSTRAINT "AiFieldSuggestion_suggestionRunId_fkey" FOREIGN KEY ("suggestionRunId") REFERENCES "kelly_calendar"."AiSuggestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelly_calendar"."AiSuggestionDecision" ADD CONSTRAINT "AiSuggestionDecision_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "kelly_calendar"."AiFieldSuggestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- KCCC check constraints and partial unique indexes
ALTER TABLE "kelly_calendar"."Event" ADD CONSTRAINT "Event_ends_after_starts_chk" CHECK ("endsAt" > "startsAt");
ALTER TABLE "kelly_calendar"."Event" ADD CONSTRAINT "Event_expected_attendance_nonneg_chk" CHECK ("expectedAttendance" IS NULL OR "expectedAttendance" >= 0);
ALTER TABLE "kelly_calendar"."Event" ADD CONSTRAINT "Event_actual_attendance_nonneg_chk" CHECK ("actualAttendance" IS NULL OR "actualAttendance" >= 0);
ALTER TABLE "kelly_calendar"."EventPackingItem" ADD CONSTRAINT "EventPackingItem_quantity_nonneg_chk" CHECK ("quantity" >= 0);
ALTER TABLE "kelly_calendar"."AiFieldSuggestion" ADD CONSTRAINT "AiFieldSuggestion_confidence_bounds_chk" CHECK ("confidence" >= 0 AND "confidence" <= 1);

CREATE UNIQUE INDEX "EventCalendarMembership_one_active_primary_idx"
ON "kelly_calendar"."EventCalendarMembership" ("eventId")
WHERE "isPrimary" = true AND "removedAt" IS NULL;

CREATE UNIQUE INDEX "CalendarMembership_active_user_calendar_idx"
ON "kelly_calendar"."CalendarMembership" ("calendarId", "userId")
WHERE "revokedAt" IS NULL;
