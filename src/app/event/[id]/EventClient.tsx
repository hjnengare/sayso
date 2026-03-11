"use client";

import { useState, useEffect, use, useRef } from "react";
import { useEventDetail } from "../../hooks/useEventDetail";
import { useEventReviews } from "../../hooks/useEventReviews";
import { useEventRatings } from "../../hooks/useEventRatings";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, ChevronUp, Calendar } from "@/app/lib/icons";
import type { Event } from "../../lib/types/Event";
import nextDynamic from "next/dynamic";
import WavyTypedTitle from "@/app/components/Animations/WavyTypedTitle";
import ReviewsList from "../../components/Reviews/ReviewsList";
import EventDetailPageSkeleton from "../../components/EventDetail/EventDetailPageSkeleton";
import {
  EventHeroImage,
  EventInfo,
  EventDetailsCard,
  EventDescription,
  EventActionCard,
  EventContactInfo,
  EventPersonalizationInsights,
} from "../../components/EventDetail";
import BusinessLocation from "../../components/BusinessDetail/BusinessLocation";
import ContactOrganiserCard from "../../components/EventsSpecials/ContactOrganiserCard";

// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

const Footer = nextDynamic(() => import("../../components/Footer/Footer"), {
  loading: () => null,
  ssr: false,
});

interface EventDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const hasReviewed = false;
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [showAllSchedules, setShowAllSchedules] = useState(false);

  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);

  // SWR-backed data fetching (caching, dedup, visibility refetch)
  const {
    event,
    occurrencesList,
    occurrencesCount,
    loading: isLoading,
    error: loadError,
    errorStatus,
    refetch: refetchReviews,
  } = useEventDetail(resolvedParams.id);

  const { reviews, refetch: refetchEventReviews } = useEventReviews(resolvedParams.id);
  const { rating: liveRating, totalReviews: liveTotalReviews } = useEventRatings(
    resolvedParams.id,
    event?.rating ?? 0,
    reviews.length
  );

  const isNotFound = errorStatus === 404 || (event !== null && event.type !== "event" && event.type !== "special");

  // Fetch related events once the main event is loaded
  useEffect(() => {
    if (!event?.id) return;
    fetch(`/api/events-and-specials/${event.id}/related?limit=4`)
      .then((r) => r.json())
      .then((data) => setRelatedEvents(data.events ?? []))
      .catch(() => {});
  }, [event?.id]);

  useEffect(() => {
    setShowAllSchedules(false);
  }, [event?.id]);

  const hasDirectCta =
    Boolean(event?.bookingUrl || event?.purchaseUrl || (event as any)?.ticketmaster_url || (event as any)?.url) ||
    (((event?.ctaSource ?? "").toLowerCase() === "whatsapp" || Boolean(event?.whatsappNumber)) && Boolean(event));

  const quicketEvent = event?.quicketEvent ?? null;
  const organiser = quicketEvent?.organiser ?? null;
  const categoryNames = [
    ...(event?.categoryLabel ? [event.categoryLabel] : []),
    ...((quicketEvent?.categories ?? [])
      .map((category) => (typeof category?.name === "string" ? category.name.trim() : ""))
      .filter(Boolean)),
  ].filter((value, index, list) => list.indexOf(value) === index);

  const ticketRows = Array.isArray(quicketEvent?.tickets) ? quicketEvent!.tickets! : [];
  const scheduleRows = Array.isArray(quicketEvent?.schedules) ? quicketEvent!.schedules! : [];
  const visibleScheduleRows = showAllSchedules ? scheduleRows : scheduleRows.slice(0, 3);
  const hasTicketInformation =
    ticketRows.length > 0
    || quicketEvent?.minimumTicketPrice != null
    || quicketEvent?.maximumTicketPrice != null
    || quicketEvent?.ticketsAvailableBoolean != null;

  const mapAddress = [quicketEvent?.venue?.addressLine1, quicketEvent?.venue?.addressLine2]
    .filter(Boolean)
    .join(", ");
  const mapLocation = [event?.location, event?.city, event?.country].filter(Boolean).join(", ");
  const mapLatitude = quicketEvent?.venue?.latitude ?? null;
  const mapLongitude = quicketEvent?.venue?.longitude ?? null;
  const hasLocationMap =
    Boolean(mapAddress || mapLocation)
    || (typeof mapLatitude === "number" && typeof mapLongitude === "number");

  const formatScheduleDateTime = (value: string | undefined): string => {
    if (!value) return "TBA";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "TBA";
    return date.toLocaleString("en-ZA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state - render full-page skeleton (no spinner loader)
  if (isLoading) {
    return <EventDetailPageSkeleton />;
  }

  if (isNotFound) {
    return (
      <div className="min-h-dvh bg-off-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-none">
            <Calendar className="w-7 h-7 text-charcoal" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Event Not Found</h1>
          <Link href="/events-specials" className="px-6 py-2.5 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full text-sm font-600 hover:bg-charcoal/90 transition-all duration-300 border border-white/30 inline-block" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Back to Events & Specials
          </Link>
        </div>
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="min-h-dvh bg-off-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-none">
            <Calendar className="w-7 h-7 text-charcoal" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Unable to Load Event</h1>
          <p className="text-charcoal/70 mb-6" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            {loadError || "Please try again."}
          </p>
          <Link href="/events-specials" className="px-6 py-2.5 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full text-sm font-600 hover:bg-charcoal/90 transition-all duration-300 border border-white/30 inline-block" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Back to Events & Specials
          </Link>
        </div>
      </div>
    );
  }

  const eventMediaLayoutId = `event-media-${event.id}`;
  const eventTitleLayoutId = `event-title-${event.id}`;

  return (
    <AnimatePresence mode="wait">
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-dvh bg-off-white font-urbanist"
        style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
      >

        <div className="min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white relative overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
   
            {/* Main Content Section */}
            <section
              className="relative"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              }}
            >
              <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
                {/* Breadcrumb Navigation */}
                <nav className="pb-1" aria-label="Breadcrumb">
                  <ol className="flex items-center gap-2 text-sm sm:text-base">
                    <li>
                      <Link href="/events-specials" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium">
                        Events & Specials
                      </Link>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-charcoal/60" />
                    </li>
                    <li>
                      <span className="text-charcoal font-semibold truncate max-w-[200px] sm:max-w-none">
                        {event?.title || 'Event Details'}
                      </span>
                    </li>
                  </ol>
                </nav>

                <div className="pt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                      <EventHeroImage event={event} sharedLayoutId={eventMediaLayoutId} />
                      <EventInfo event={event} sharedTitleLayoutId={eventTitleLayoutId} />
                      <EventDescription event={event} />

                      {hasTicketInformation && (
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6">
                          <h3
                            className="text-h3 font-semibold text-charcoal mb-3"
                            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                          >
                            Ticket Information
                          </h3>

                          <div className="mb-3 flex flex-wrap gap-2 text-xs">
                            {quicketEvent?.minimumTicketPrice != null && (
                              <span className="inline-flex items-center rounded-full bg-off-white/70 px-3 py-1.5 text-charcoal/80 font-semibold">
                                From R{quicketEvent.minimumTicketPrice}
                              </span>
                            )}
                            {quicketEvent?.maximumTicketPrice != null
                              && quicketEvent.maximumTicketPrice !== quicketEvent.minimumTicketPrice && (
                                <span className="inline-flex items-center rounded-full bg-off-white/70 px-3 py-1.5 text-charcoal/80 font-semibold">
                                  Up to R{quicketEvent.maximumTicketPrice}
                                </span>
                            )}
                            {quicketEvent?.ticketsAvailableBoolean != null && (
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1.5 font-semibold ${
                                  quicketEvent.ticketsAvailableBoolean
                                    ? "bg-sage/15 text-sage"
                                    : "bg-coral/15 text-coral"
                                }`}
                              >
                                {quicketEvent.ticketsAvailableBoolean ? "Tickets Available" : "Sold Out"}
                              </span>
                            )}
                          </div>

                          {ticketRows.length > 0 && (
                            <ul className="space-y-2">
                              {ticketRows.slice(0, 6).map((ticket, index) => (
                                <li key={`${ticket.id ?? "ticket"}-${index}`} className="rounded-[12px] bg-off-white/55 p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p
                                        className="text-sm font-semibold text-charcoal"
                                        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                                      >
                                        {ticket.name || "Ticket"}
                                      </p>
                                      {ticket.description && (
                                        <p
                                          className="mt-0.5 text-xs text-charcoal/70"
                                          style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                                        >
                                          {ticket.description}
                                        </p>
                                      )}
                                    </div>
                                    {typeof ticket.price === "number" && ticket.price > 0 && (
                                      <span
                                        className="text-sm font-semibold text-charcoal"
                                        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                                      >
                                        R{ticket.price}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {scheduleRows.length > 0 && (
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h3
                              className="text-h3 font-semibold text-charcoal"
                              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                            >
                              Event Schedules
                            </h3>
                            <span
                              className="inline-flex items-center rounded-full bg-off-white/70 px-2.5 py-1 text-xs font-semibold text-charcoal/75"
                              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                            >
                              {scheduleRows.length}
                            </span>
                          </div>

                          <ul className="space-y-2.5">
                            {visibleScheduleRows.map((schedule, index) => (
                              <li key={`${schedule.id ?? "schedule"}-${index}`} className="rounded-[12px] bg-off-white/55 p-3">
                                <p
                                  className="text-sm font-semibold text-charcoal"
                                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                                >
                                  {schedule.name || `Schedule ${index + 1}`}
                                </p>
                                <p
                                  className="mt-1 text-xs text-charcoal/70"
                                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                                >
                                  {formatScheduleDateTime(schedule.startDate)}
                                  {schedule.endDate ? ` → ${formatScheduleDateTime(schedule.endDate)}` : ""}
                                </p>
                              </li>
                            ))}
                          </ul>

                          {scheduleRows.length > 3 && (
                            <button
                              type="button"
                              onClick={() => setShowAllSchedules((prev) => !prev)}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-off-white/70 px-3 py-1.5 text-xs font-semibold text-charcoal/80 transition-colors duration-200 hover:bg-off-white"
                              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                            >
                              {showAllSchedules ? (
                                <>
                                  <ChevronUp className="h-3.5 w-3.5" />
                                  Show fewer schedules
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                  Show all schedules
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {hasLocationMap && (
                        <div ref={mapSectionRef}>
                          <BusinessLocation
                            name={quicketEvent?.venue?.name || event.venueName || event.title}
                            address={mapAddress || undefined}
                            location={mapLocation || undefined}
                            latitude={mapLatitude}
                            longitude={mapLongitude}
                            isUserUploaded={false}
                          />
                        </div>
                      )}

                      {(() => {
                        // Compute the current event's date label to exclude from "More dates"
                        const currentStart = new Date(event.startDateISO || event.startDate);
                        const currentEnd = event.endDateISO || event.endDate ? new Date(event.endDateISO || event.endDate!) : null;
                        const currentSameDay =
                          currentEnd &&
                          currentStart.getFullYear() === currentEnd.getFullYear() &&
                          currentStart.getMonth() === currentEnd.getMonth() &&
                          currentStart.getDate() === currentEnd.getDate();
                        const currentStartLabel = Number.isFinite(currentStart.getTime())
                          ? currentStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : event.startDate;
                        const currentEndLabel =
                          currentEnd && Number.isFinite(currentEnd.getTime())
                            ? currentEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : undefined;
                        const currentDateLabel = currentEnd && !currentSameDay && currentEndLabel
                          ? `${currentStartLabel}–${currentEndLabel}`
                          : currentStartLabel;

                        const otherDates = occurrencesList
                          .reduce<Array<{ id: string; label: string }>>((unique, o) => {
                            const start = new Date(o.start_date);
                            const end = o.end_date ? new Date(o.end_date) : null;
                            const sameDay =
                              end &&
                              start.getFullYear() === end.getFullYear() &&
                              start.getMonth() === end.getMonth() &&
                              start.getDate() === end.getDate();

                            const startLabel = Number.isFinite(start.getTime())
                              ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : o.start_date;
                            const endLabel =
                              end && Number.isFinite(end.getTime())
                                ? end.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                : o.end_date;

                            const label = end && !sameDay && endLabel ? `${startLabel}–${endLabel}` : startLabel;

                            if (label !== currentDateLabel && !unique.some((u) => u.label === label)) {
                              unique.push({ id: o.id, label });
                            }
                            return unique;
                          }, []);

                        if (otherDates.length === 0) return null;

                        return (
                          <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px]  shadow-md p-4 sm:p-6">
                            <h3
                              className="text-h3 font-semibold text-charcoal mb-3"
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                              More dates
                            </h3>
                            <ul className="space-y-2">
                              {otherDates.map((o) => {
                                const hrefBase = event?.type === "special" ? "/special" : "/event";
                                return (
                                  <li key={o.id} className="flex items-center justify-between gap-3">
                                    <span
                                      className="text-body-sm text-charcoal/80"
                                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                    >
                                      {o.label}
                                    </span>
                                    <Link
                                      href={`${hrefBase}/${o.id}`}
                                      className="text-body-sm font-semibold text-coral hover:underline"
                                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                    >
                                      View
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })()}

                      {/* Contact Info - Mobile Only (hide when direct booking is available) */}
                      {!hasDirectCta && (
                        <div className="lg:hidden">
                          <EventContactInfo event={event} />
                        </div>
                      )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-4 sm:space-y-6">
                      {categoryNames.length > 0 && (
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6">
                          <h3
                            className="text-h3 font-semibold text-charcoal mb-3"
                            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                          >
                            Event Categories
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {categoryNames.map((category) => (
                              <span
                                key={category}
                                className="inline-flex items-center rounded-full bg-off-white/70 px-3 py-1.5 text-xs font-semibold text-charcoal/80"
                                style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <EventActionCard
                        eventId={event.id}
                        hasReviewed={hasReviewed}
                        bookingUrl={event.bookingUrl}
                        purchaseUrl={event.purchaseUrl}
                        ticketmasterUrl={(event as any).ticketmaster_url || (event as any).url}
                        bookingContact={event.bookingContact}
                        eventData={event}
                      />
                      <EventDetailsCard event={event} />
                      <EventPersonalizationInsights event={{ id: event.id, rating: liveRating, totalReviews: liveTotalReviews }} />
                      <ContactOrganiserCard organiser={organiser} animationDelay={0.58} />

                      {/* Contact Info - Desktop Only (hide when direct booking is available) */}
                      {!hasDirectCta && (
                        <div className="hidden lg:block">
                          <EventContactInfo event={event} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Reviews Section */}
            <section className="mx-auto w-full max-w-[2000px] px-2 relative z-10 mt-8 pb-8">
              <div className="text-center mb-6">
                <WavyTypedTitle
                  text="Event Reviews"
                  as="h2"
                  className="font-urbanist text-lg sm:text-xl font-700 text-charcoal"
                  typingSpeedMs={40}
                  startDelayMs={300}
                  disableWave={true}
                  style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 700 }}
                />
              </div>

              <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-6 sm:p-8">
                <ReviewsList
                  reviews={reviews.map((review): any => ({
                    ...review,
                    business_id: event.id,
                  }))}
                  loading={false}
                  error={null}
                  showBusinessInfo={false}
                  businessId={event.id}
                  onUpdate={refetchReviews}
                  emptyMessage="No reviews yet. Be the first to review this event!"
                  emptyStateAction={{
                    label: hasReviewed ? 'Already Reviewed' : 'Write First Review',
                    href: `/write-review/event/${event.id}`,
                    disabled: hasReviewed,
                  }}
                />
              </div>

              {relatedEvents.length > 0 && (
                <div className="mt-6 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6">
                  <h3
                    className="text-h3 font-semibold text-charcoal mb-4"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    More {event.type === 'special' ? 'Specials' : 'Events'} Near You
                  </h3>
                  <ul className="space-y-3">
                    {relatedEvents.map((rel) => (
                      <li key={rel.id}>
                        <Link
                          href={rel.href ?? `/event/${rel.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-charcoal/5">
                            {rel.image ? (
                              <img
                                src={rel.image}
                                alt={rel.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-charcoal/30 text-lg">
                                🎟
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-semibold text-charcoal group-hover:text-navbar-bg transition-colors line-clamp-1"
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                              {rel.title}
                            </p>
                            <p
                              className="text-xs text-charcoal/60 line-clamp-1"
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                              {rel.startDate}{rel.city ? ` · ${rel.city}` : ''}
                            </p>
                          </div>
                          {rel.availabilityStatus && (
                            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rel.availabilityStatus === 'sold_out'
                                ? 'bg-coral/15 text-coral'
                                : 'bg-amber-500/15 text-amber-600'
                            }`} style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                              {rel.availabilityStatus === 'sold_out' ? 'Sold Out' : 'Limited'}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

        <Footer />
      </m.div>
    </AnimatePresence>
  );
}
