"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronRight } from "react-feather";
import { Event } from "../../data/eventsData";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import nextDynamic from "next/dynamic";
import { PageLoader, Loader } from "../../components/Loader";
import Header from "../../components/Header/Header";
import {
  EventHeroImage,
  EventInfo,
  EventDetailsCard,
  EventDescription,
  EventActionCard,
  EventContactInfo,
} from "../../components/EventDetail";

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
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();

  // Check if event is already saved on mount
  useEffect(() => {
    if (!event) return;

    const checkSavedStatus = async () => {
      try {
        const response = await fetch(`/api/user/saved-events?event_id=${event.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isSaved || false);
        }
      } catch (error) {
        // Silently fail - user might not be logged in
        console.log('Could not check saved status:', error);
      }
    };

    checkSavedStatus();
  }, [event]);

  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${resolvedParams.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setEvent(null);
            setLoading(false);
            return;
          }
          throw new Error(`Failed to fetch event: ${response.statusText}`);
        }

        const data = await response.json();
        const dbEvent = data.event;

        if (!dbEvent) {
          setEvent(null);
          setLoading(false);
          return;
        }

        // Transform database event to Event type
        const formatDate = (dateString: string | null) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
          });
        };

        const formatPrice = (priceRange: any) => {
          if (!priceRange || !Array.isArray(priceRange) || priceRange.length === 0) {
            return null;
          }
          const price = priceRange[0];
          if (price.min && price.max) {
            return `£${price.min} - £${price.max}`;
          }
          if (price.min) {
            return `From £${price.min}`;
          }
          return null;
        };

        const getIcon = (segment: string | null, genre: string | null) => {
          const segmentLower = (segment || '').toLowerCase();
          const genreLower = (genre || '').toLowerCase();
          
          if (segmentLower.includes('music') || genreLower.includes('music')) {
            return 'musical-notes-outline';
          }
          if (segmentLower.includes('sport')) {
            return 'basketball-outline';
          }
          if (segmentLower.includes('art') || segmentLower.includes('theatre')) {
            return 'brush-outline';
          }
          if (segmentLower.includes('comedy')) {
            return 'happy-outline';
          }
          return 'calendar-outline';
        };

        const transformedEvent: Event = {
          id: dbEvent.ticketmaster_id || dbEvent.id,
          title: dbEvent.title || 'Untitled Event',
          type: 'event' as const,
          image: dbEvent.image_url || null,
          alt: `${dbEvent.title} at ${dbEvent.venue_name || dbEvent.city || 'location'}`,
          icon: getIcon(dbEvent.segment, dbEvent.genre),
          location: dbEvent.venue_name || dbEvent.city || 'Location TBD',
          rating: 4.5,
          startDate: formatDate(dbEvent.start_date),
          endDate: dbEvent.end_date ? formatDate(dbEvent.end_date) : undefined,
          price: formatPrice(dbEvent.price_range),
          description: dbEvent.description || undefined,
          href: `/event/${dbEvent.ticketmaster_id || dbEvent.id}`,
        };

        setEvent(transformedEvent);
      } catch (err) {
        console.error('[EventDetailPage] Error fetching event:', err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [resolvedParams.id]);

  const handleLike = async () => {
    if (!event) return;
    
    // Check if user is authenticated
    if (!user) {
      showToast("Please log in to save events", "error");
      return;
    }
    
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    
    try {
      if (newLikedState) {
        // Save the event
        const response = await fetch('/api/user/saved-events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ event_id: event.id }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle specific error cases
          if (response.status === 401) {
            showToast("Please log in to save events", "error");
            setIsLiked(!newLikedState);
            return;
          }
          
          if (response.status === 500 && errorData.code === '42P01') {
            showToast("Saving events is not available at the moment", "error");
            setIsLiked(!newLikedState);
            return;
          }
          
          throw new Error(errorData.error || errorData.details || 'Failed to save event');
        }

        showToast("Event saved to favorites", "success");
      } else {
        // Unsave the event
        const response = await fetch(`/api/user/saved-events?event_id=${event.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle specific error cases
          if (response.status === 401) {
            showToast("Please log in to manage saved events", "error");
            setIsLiked(!newLikedState);
            return;
          }
          
          throw new Error(errorData.error || errorData.details || 'Failed to unsave event');
        }

        showToast("Event removed from favorites", "success");
      }
    } catch (error) {
      // Revert the state on error
      setIsLiked(!newLikedState);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update favorites';
      showToast(errorMessage, "error");
      console.error('Error saving/unsaving event:', error);
    }
  };

  // Loading state - show full page loader with transition
  if (loading) {
    return (
      <div className="min-h-dvh bg-off-white">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-off-white min-h-screen w-full flex items-center justify-center"
          >
            <PageLoader size="lg" variant="wavy" color="sage"  />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-dvh bg-off-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-white/40">
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={resolvedParams.id}
        initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
        transition={{
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.5 },
          filter: { duration: 0.55 }
        }}
        className="min-h-dvh bg-off-white font-urbanist"
        style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
      {/* Header */}
      <Header
        showSearch={false}
        variant="white"
        backgroundClassName="bg-navbar-bg"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />

      <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
        <div className="pt-20 sm:pt-24">

        {/* Main Content Section */}
        <section
          className="relative"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        >
          <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
            {/* Breadcrumb Navigation */}
            <nav className="pt-4 mb-6 sm:mb-8 px-2" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm sm:text-base flex-nowrap overflow-x-auto scrollbar-hide">
                {/* Hide Home on mobile - show max 2 items on small devices */}
                <li className="hidden sm:flex flex-shrink-0">
                  <Link href="/home" className="text-charcoal/90 hover:text-sage transition-colors duration-200 font-medium whitespace-nowrap" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Home
                  </Link>
                </li>
                <li className="hidden sm:flex items-center flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-charcoal/40" />
                </li>
                <li className="flex-shrink-0">
                  <Link href="/events-specials" className="text-charcoal/90 hover:text-sage transition-colors duration-200 font-medium whitespace-nowrap" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Events & Specials
                  </Link>
                </li>
                <li className="flex items-center flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-charcoal/40" />
                </li>
                <li className="min-w-0 flex-1">
                  <span className="text-charcoal font-semibold truncate block" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    {event.title}
                  </span>
                </li>
              </ol>
            </nav>
            <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                  <EventHeroImage event={event} isLiked={isLiked} onLike={handleLike} />
                  <EventInfo event={event} />
                  <EventDetailsCard event={event} />
                  <EventDescription event={event} />
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-4 sm:space-y-6">
                  <EventActionCard />
                  <EventContactInfo event={event} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
        </div>
      </div>
      </motion.div>
    </AnimatePresence>
  );
}
