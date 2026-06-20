-- DropForeignKey
ALTER TABLE "MediaAsset" DROP CONSTRAINT "MediaAsset_seriesId_fkey";

-- AddForeignKey
ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_seriesId_fkey"
FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;