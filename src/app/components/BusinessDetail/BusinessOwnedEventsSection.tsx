import React from 'react';
import { Calendar, MapPin, DollarSign, Loader } from 'lucide-react';
import { useBusinessEvents } from '../../hooks/useBusinessEvents';

interface BusinessOwnedEventsSectionProps {
  businessId: string;
  businessName: string;
}

export default function BusinessOwnedEventsSection({
  businessId,
  businessName,
}: BusinessOwnedEventsSectionProps) {
  const { events, loading } = useBusinessEvents(businessId);

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="py-8 border-t border-charcoal/10">
      <h3 className="text-xl font-semibold text-charcoal mb-6">
        Events & Specials from {businessName}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {events.map(event => (
          <div
            key={event.id}
            className="bg-card-bg rounded-[12px] border border-white/60 overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
          >
            <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navbar-bg/10 text-navbar-bg text-xs font-semibold">
                    {event.type === 'event' ? 'Event' : 'Special Offer'}
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-charcoal leading-tight truncate">
                    {event.title}
                  </h4>
                </div>
              </div>

              <div className="space-y-2 text-sm text-charcoal/75">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="flex-shrink-0 text-navbar-bg" />
                  <span className="truncate">
                    {new Date(event.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {event.endDate && event.endDate !== event.startDate && (
                      <>
                        {' — '}
                        {new Date(event.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </>
                    )}
                  </span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="flex-shrink-0 text-navbar-bg/80" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                {event.price && (
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="flex-shrink-0 text-navbar-bg/80" />
                    <span>${event.price.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {event.description && (
                <p className="text-sm text-charcoal/70 leading-snug line-clamp-2">
                  {event.description}
                </p>
              )}

              <div className="pt-2 mt-auto flex items-center justify-between gap-2">
                <p className="text-xs text-charcoal/50">Hosted by {businessName}</p>
                {event.bookingUrl && event.bookingUrl.trim() ? (
                  <a
                    href={event.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-navbar-bg text-white rounded-full text-sm font-semibold hover:bg-navbar-bg/90 transition-all duration-200 shadow-md border border-white/40"
                  >
                    Reserve
                  </a>
                ) : event.bookingContact && event.bookingContact.trim() ? (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/60 text-charcoal text-xs font-semibold border border-white/70">
                    {event.bookingContact}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/60 text-charcoal/70 text-xs font-semibold border border-white/70">
                    Limited availability
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
