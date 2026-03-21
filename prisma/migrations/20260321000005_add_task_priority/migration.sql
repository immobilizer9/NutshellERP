-- Add priority to Task
ALTER TABLE "Task" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
