import { redirect } from "next/navigation";
import { ParticipantLanding } from "./participant-landing";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) {
    redirect("/admin");
  }
  return <ParticipantLanding meetingId={id} />;
}
