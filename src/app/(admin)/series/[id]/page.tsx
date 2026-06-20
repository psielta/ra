import { SeriesDetail } from "@/components/series/series-detail";

export const metadata = {
  title: "Série",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SeriesDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <SeriesDetail id={id} />;
}
