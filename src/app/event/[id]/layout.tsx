import { Metadata } from 'next';
import Link from 'next/link';
import { DEFAULT_SITE_DESCRIPTION, generateSEOMetadata, SITE_URL } from '../../lib/utils/seoMetadata';
import { getServerSupabase } from '../../lib/supabase/server';
import { getServiceSupabase } from '../../lib/admin';
import SchemaMarkup from '../../components/SEO/SchemaMarkup';
import { generateBreadcrumbSchema, generateEventSchema } from '../../lib/utils/schemaMarkup';

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function getEventData(id: string) {
  const supabase = (() => {
    try {
      return getServiceSupabase();
    } catch {
      return null;
    }
  })();

  const dbClient = supabase ?? (await getServerSupabase());

  // Source of truth for event detail pages.
  const { data: consolidatedEvent } = await dbClient
    .from('events_and_specials')
    .select('id, title, description, image, location, start_date, end_date, type')
    .eq('id', id)
    .in('type', ['event', 'special'])
    .maybeSingle();

  if (consolidatedEvent) {
    return {
      id: consolidatedEvent.id,
      title: consolidatedEvent.title,
      description: consolidatedEvent.description,
      image: consolidatedEvent.image,
      image_url: consolidatedEvent.image,
      location: consolidatedEvent.location,
      start_date: consolidatedEvent.start_date,
      end_date: consolidatedEvent.end_date,
      type: consolidatedEvent.type,
    };
  }

  // DEPRECATED: fallback for legacy ticketmaster_id slugs in bookmarked/shared URLs.
  // New events are in events_and_specials and resolved by the block above.
  const { data: ticketmasterByExternalId } = await dbClient
    .from('ticketmaster_events')
    .select('id, title, description, image_url, image, location, start_date')
    .eq('ticketmaster_id', id)
    .maybeSingle();

  if (ticketmasterByExternalId) {
    return ticketmasterByExternalId;
  }

  // DEPRECATED: UUID lookup in legacy ticketmaster_events table.
  // New events with UUID ids are resolved via events_and_specials above.
  if (UUID_RE.test(id)) {
    const { data: ticketmasterByUuid } = await dbClient
      .from('ticketmaster_events')
      .select('id, title, description, image_url, image, location, start_date')
      .eq('id', id)
      .maybeSingle();

    if (ticketmasterByUuid) {
      return ticketmasterByUuid;
    }
  }

  return null;
}

/**
 * Generate dynamic metadata for event pages
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventData(id);

  if (!event) {
    return generateSEOMetadata({
      title: 'Event details | Sayso',
      description: DEFAULT_SITE_DESCRIPTION,
      url: `/event/${id}`,
      noindex: true,
      nofollow: true,
    });
  }

  return generateSEOMetadata({
    title: `${event.title} in Cape Town | Sayso`,
    description: event.description || `Discover ${event.title} on Sayso, Cape Town's hyper-local reviews and discovery app.`,
    keywords: [event.title, 'cape town events', 'sayso events'],
    image: event.image_url || event.image,
    url: `/event/${id}`,
    type: 'article',
  });
}

export default async function EventLayout({
  children,
  params,
}: EventLayoutProps) {
  const { id } = await params;
  const event = await getEventData(id);

  let schemas: object[] = [];
  let relatedLinks: Array<{ href: string; label: string }> = [];
  let eventSummary: { title: string; description: string; location: string } | null = null;

  if (event) {
    const eventUrl = `${SITE_URL}/event/${id}`;
    const location = event.location || '';
    const citySlug = location ? toSlug(String(location).split(',')[0]) : '';
    const startDate = event.start_date || undefined;

    const eventSchema = generateEventSchema({
      name: event.title,
      description: event.description || undefined,
      image: event.image_url || event.image || undefined,
      url: eventUrl,
      location: location || undefined,
      startDate: startDate || undefined,
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Events & Specials', url: `${SITE_URL}/events-specials` },
      { name: event.title, url: eventUrl },
    ]);

    schemas = [eventSchema, breadcrumbSchema];
    eventSummary = {
      title: event.title,
      description: event.description || `Discover ${event.title} on Sayso.`,
      location: location || 'Cape Town',
    };
    relatedLinks = [
      { href: '/events-specials', label: 'More events and specials' },
      ...(citySlug ? [{ href: `/${citySlug}`, label: `More events in ${location}` }] : []),
    ];
  }

  return (
    <>
      {schemas.length > 0 && <SchemaMarkup schemas={schemas} />}
      {eventSummary && (
        <article aria-label="Event summary" className="sr-only">
          <h1>{eventSummary.title}</h1>
          <p>{eventSummary.description}</p>
          <p>{eventSummary.location}</p>
        </article>
      )}
      {relatedLinks.length > 0 && (
        <nav aria-label="Related links" className="sr-only">
          <ul>
            {relatedLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {children}
    </>
  );
}
