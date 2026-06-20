ALTER TABLE "Playlist" ADD COLUMN "isFavorites" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Playlist_userId_isFavorites_idx" ON "Playlist"("userId", "isFavorites");

CREATE UNIQUE INDEX "Playlist_userId_favorites_key" ON "Playlist"("userId") WHERE "isFavorites" = true;
