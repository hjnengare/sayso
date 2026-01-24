import { Metadata } from 'next';
import { generateSEOMetadata } from '../../lib/utils/seoMetadata';
import { getServerSupabase } from '../../lib/supabase/server';

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

/**
 * Generate dynamic metadata for event pages
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: event, error } = await supabase
    .from('ticketmaster_events')
    .select('*')
    .eq('id', id)
    .single();

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
    image: event.image_url,
    url: `/event/${id}`,
    type: 'article',
  });
}

export default async function EventLayout({
  children,
}: EventLayoutProps) {
  return <>{children}</>;
}

