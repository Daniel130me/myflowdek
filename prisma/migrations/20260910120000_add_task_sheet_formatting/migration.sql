-- Persist task formatting applied from the sheet and task views.
ALTER TABLE "Task"
ADD COLUMN "bold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "color" TEXT,
ADD COLUMN "level" INTEGER NOT NULL DEFAULT 0;
