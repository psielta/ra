-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "TranscodeJobStatus" AS ENUM ('PROCESSING', 'READY', 'ERROR');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "mediaType" "MediaType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "playbackUrl" TEXT,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscodeJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "status" "TranscodeJobStatus" NOT NULL DEFAULT 'PROCESSING',
    "storageKey" TEXT NOT NULL,
    "errorMessage" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TranscodeJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAsset_userId_createdAt_idx" ON "MediaAsset"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TranscodeJob_userId_status_idx" ON "TranscodeJob"("userId", "status");

-- CreateIndex
CREATE INDEX "TranscodeJob_mediaAssetId_idx" ON "TranscodeJob"("mediaAssetId");

-- CreateIndex
CREATE INDEX "TranscodeJob_status_createdAt_idx" ON "TranscodeJob"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscodeJob" ADD CONSTRAINT "TranscodeJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscodeJob" ADD CONSTRAINT "TranscodeJob_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;