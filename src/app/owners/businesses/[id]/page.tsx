import { redirect } from "next/navigation";

export default async function OwnersBusinessLegacyRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/my-businesses/businesses/${id}`);
}
