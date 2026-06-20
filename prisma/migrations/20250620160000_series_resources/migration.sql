-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "seriesId" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "description" TEXT;

-- CreateIndex
CREATE INDEX "MediaAsset_seriesId_createdAt_idx" ON "MediaAsset"("seriesId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Series_userId_slug_key" ON "Series"("userId", "slug");

-- CreateIndex
CREATE INDEX "Series_userId_createdAt_idx" ON "Series"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;