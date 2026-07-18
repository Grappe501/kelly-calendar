-- Step 4 AUTH-RBAC identity foundation
-- Owned schema only: kelly_calendar
-- Does not touch public, auth, or RedDirt tables.

CREATE TYPE "kelly_calendar"."SystemRole" AS ENUM (
  'KELLY',
  'CAMPAIGN_MANAGER',
  'SCHEDULER',
  'STAFF',
  'VOLUNTEER',
  'READ_ONLY_ADVISOR',
  'SYSTEM_AI'
);

CREATE TABLE "kelly_calendar"."User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "systemRole" "kelly_calendar"."SystemRole" NOT NULL,
  "passwordHash" TEXT,
  "externalAuthId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "mustResetPassword" BOOLEAN NOT NULL DEFAULT false,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "kelly_calendar"."User"("email");
CREATE UNIQUE INDEX "User_externalAuthId_key" ON "kelly_calendar"."User"("externalAuthId");
CREATE INDEX "User_systemRole_idx" ON "kelly_calendar"."User"("systemRole");
CREATE INDEX "User_isActive_idx" ON "kelly_calendar"."User"("isActive");

CREATE TABLE "kelly_calendar"."Team" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Team_slug_key" ON "kelly_calendar"."Team"("slug");

CREATE TABLE "kelly_calendar"."TeamMembership" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleLabel" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamMembership_teamId_userId_key" ON "kelly_calendar"."TeamMembership"("teamId", "userId");
CREATE INDEX "TeamMembership_userId_idx" ON "kelly_calendar"."TeamMembership"("userId");
CREATE INDEX "TeamMembership_teamId_isActive_idx" ON "kelly_calendar"."TeamMembership"("teamId", "isActive");

ALTER TABLE "kelly_calendar"."TeamMembership"
  ADD CONSTRAINT "TeamMembership_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "kelly_calendar"."Team"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."TeamMembership"
  ADD CONSTRAINT "TeamMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "kelly_calendar"."User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgentHash" TEXT,

  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_tokenId_key" ON "kelly_calendar"."AuthSession"("tokenId");
CREATE INDEX "AuthSession_userId_idx" ON "kelly_calendar"."AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "kelly_calendar"."AuthSession"("expiresAt");

ALTER TABLE "kelly_calendar"."AuthSession"
  ADD CONSTRAINT "AuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "kelly_calendar"."User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
