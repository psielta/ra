import { PlaylistDetail } from "@/components/playlists/playlist-detail";

export const metadata = {
  title: "Playlist",
};

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PlaylistDetail id={id} />;
}
