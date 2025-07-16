-- AlterTable
ALTER TABLE "TaskLog" ADD COLUMN "groupTaskId" TEXT;

-- CreateIndex
CREATE INDEX "TaskLog_groupTaskId_idx" ON "TaskLog"("groupTaskId");
