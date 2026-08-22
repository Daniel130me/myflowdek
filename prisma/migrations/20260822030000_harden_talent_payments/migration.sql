-- Prevent duplicate active funding records for the same engagement target.
-- COALESCE gives whole-engagement payments (null milestone) a stable key.
CREATE UNIQUE INDEX "EngagementPayment_one_active_per_target"
ON "EngagementPayment" ("engagementId", COALESCE("milestoneId", '__FULL_ENGAGEMENT__'))
WHERE "state" NOT IN ('FAILED', 'REFUNDED');
