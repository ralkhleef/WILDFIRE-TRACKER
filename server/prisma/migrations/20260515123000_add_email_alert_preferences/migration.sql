-- AlterTable
ALTER TABLE "AlertPreference"
ADD COLUMN "emailAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastAlertSentAt" TIMESTAMP(3);
