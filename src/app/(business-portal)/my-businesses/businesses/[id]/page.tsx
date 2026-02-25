import { redirect } from "next/navigation";

export default async function LegacyMyBusinessesBusinessRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/my-businesses/${id}`);
}

