import { SpaceDetailView } from "@/components/SpaceDetailView";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SpaceDetailView spaceId={id} />;
}
