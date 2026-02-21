export const revalidate = 300;

import EventClient from "./EventClient";

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  return <EventClient params={params} />;
}
