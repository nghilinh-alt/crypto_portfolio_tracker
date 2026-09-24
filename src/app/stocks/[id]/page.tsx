import TokenDetailView from "@/components/TokenDetailView";

export const dynamic = "force-dynamic";

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TokenDetailView id={id} />;
}
