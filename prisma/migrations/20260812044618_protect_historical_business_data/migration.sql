-- Protect historical business data: ensure offboarding a user (User.status=
-- DELETED) or deleting a task never cascades into the project's approval,
-- timesheet, expense, or form-submission history.
--
-- Strategy:
--   1. Drop the existing ON DELETE CASCADE FKs on the user/task author
--      columns of ApprovalRequest / TimesheetEntry.
--   2. Make the author columns nullable (so the FK can SET NULL when the
--      referenced user is hard-deleted).
--   3. Re-add the FKs with ON DELETE SET NULL.
--   4. Add the missing FKs (TimesheetEntry.taskId, Expense.createdBy,
--      FormSubmission.submittedBy/convertedTaskId, Goal.workspaceId) — all
--      with ON DELETE SET NULL except Goal.workspaceId which CASCADEs (a
--      workspace deletion should take its goals with it).
--   5. Add supporting indexes for the new FK columns.

-- ---------------------------------------------------------------------------
-- Step 1: drop existing user-FK constraints (previously ON DELETE CASCADE)
-- ---------------------------------------------------------------------------
ALTER TABLE "ApprovalRequest" DROP CONSTRAINT "ApprovalRequest_requesterId_fkey";
ALTER TABLE "ApprovalRequest" DROP CONSTRAINT "ApprovalRequest_approverId_fkey";
ALTER TABLE "TimesheetEntry" DROP CONSTRAINT "TimesheetEntry_userId_fkey";

-- ---------------------------------------------------------------------------
-- Step 2: make author columns nullable so SET NULL is valid
-- ---------------------------------------------------------------------------
ALTER TABLE "ApprovalRequest" ALTER COLUMN "requesterId" DROP NOT NULL;
ALTER TABLE "ApprovalRequest" ALTER COLUMN "approverId" DROP NOT NULL;
ALTER TABLE "TimesheetEntry" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "createdBy" DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- Step 3: re-add user/approver FKs with ON DELETE SET NULL
-- ---------------------------------------------------------------------------
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Step 4: add previously-missing FKs
-- ---------------------------------------------------------------------------
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_convertedTaskId_fkey" FOREIGN KEY ("convertedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Step 5: supporting indexes for the new FK columns
-- ---------------------------------------------------------------------------
CREATE INDEX "TimesheetEntry_taskId_idx" ON "TimesheetEntry"("taskId");
CREATE INDEX "Expense_createdBy_idx" ON "Expense"("createdBy");
CREATE INDEX "FormSubmission_submittedBy_idx" ON "FormSubmission"("submittedBy");
CREATE INDEX "FormSubmission_convertedTaskId_idx" ON "FormSubmission"("convertedTaskId");
