-- Recurrence lineage: track the original recurring task that produced each
-- generated instance. Distinct from `parentId` (subtask hierarchy).
-- The recurrence service sets this on every generated occurrence so the
-- chain can be traced and deduplicated even if the instance is later
-- re-parented as a subtask of something else.

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "recurrenceSourceId" TEXT;

-- CreateIndex
CREATE INDEX "Task_recurrenceSourceId_idx" ON "Task"("recurrenceSourceId");

-- AddForeignKey (self-relation; ON DELETE SET NULL so deleting the original
-- template doesn't wipe the generated occurrences — they keep their data
-- but lose the lineage pointer).
ALTER TABLE "Task" ADD CONSTRAINT "Task_recurrenceSourceId_fkey" FOREIGN KEY ("recurrenceSourceId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
