import { ResourceDetail } from "@/components/media/resource-detail";

export const metadata = {
  title: "Recurso",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResourceDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <ResourceDetail id={id} />;
}
