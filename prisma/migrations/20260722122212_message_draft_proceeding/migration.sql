-- AlterTable
ALTER TABLE "message_drafts" ADD COLUMN "proceedingId" TEXT;

-- AddForeignKey
ALTER TABLE "message_drafts" ADD CONSTRAINT "message_drafts_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "proceedings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
