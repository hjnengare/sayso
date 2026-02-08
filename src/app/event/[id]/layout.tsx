import { Metadata } from 'next';
import { generateSEOMetadata } from '../../lib/utils/seoMetadata';
import { getServerSupabase } from '../../lib/supabase/server';

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate dynamic metadata for event pages
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const tryByTicketmasterId = async () =>
    supabase.from('ticketmaster_events').select('*').eq('ticketmaster_id', id).single();

const tryByUuidId = async () =>
  supabase.from('ticketmaster_events').select('*').eq('id', id).single();

const tryBusinessEventByUuidId = async () =>
  supabase
    .from('events_and_specials')
    .select('*')
    .eq('id', id)
    .eq('type', 'event')
    .single();

let event: any = null;
let error: any = null;

({ data: event, error } = await tryByTicketmasterId());
const notFound = error?.code === 'PGRST116';
if (notFound && UUID_RE.test(id)) {
  ({ data: event, error } = await tryByUuidId());
}
if ((error?.code === 'PGRST116' || !event) && UUID_RE.test(id)) {
  ({ data: event, error } = await tryBusinessEventByUuidId());
}

if (!event || error) {
  return generateSEOMetadata({
    title: 'Event',
    description: 'View event details and information.',
      url: `/event/${id}`,
    });
  }

return generateSEOMetadata({
  title: event.title,
  description: event.description || `Join us for ${event.title} - discover event details, location, and more.`,
  keywords: [event.title, 'event', 'local event', 'special'],
  image: event.image_url || event.image,
  url: `/event/${id}`,
  type: 'article',
});
}

export default async function EventLayout({
  children,
}: EventLayoutProps) {
  return <>{children}</>;
}

