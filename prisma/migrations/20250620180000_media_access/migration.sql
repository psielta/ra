-- CreateTable
CREATE TABLE "MediaAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAccess_userId_accessedAt_idx" ON "MediaAccess"("userId", "accessedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAccess_userId_mediaAssetId_key" ON "MediaAccess"("userId", "mediaAssetId");

-- AddForeignKey
ALTER TABLE "MediaAccess" ADD CONSTRAINT "MediaAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAccess" ADD CONSTRAINT "MediaAccess_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;