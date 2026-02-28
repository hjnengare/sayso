// src/components/EventDetail/EventActionCard.tsx
"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Calendar, Share2, Bell, Users, Check, X } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import type { Event } from "../../lib/types/Event";
import { resolveCtaTarget } from "../../lib/events/cta";
import { downloadICS } from "../../lib/events/generateICS";
import { useEventRsvp } from "../../hooks/useEventRsvp";
import { useEventReminder, type RemindBefore } from "../../hooks/useEventReminder";

interface EventActionCardProps {
  eventId?: string;
  hasReviewed?: boolean;
  bookingUrl?: string;
  ticketmasterUrl?: string;
  bookingContact?: string;
  purchaseUrl?: string;
  eventData?: Event;
}

interface EventQuickActionButtonProps {
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  active?: boolean;
  activeClassName: string;
  idleHoverClassName: string;
  onClick: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}

function EventQuickActionButton({
  label,
  ariaLabel,
  icon,
  active = false,
  activeClassName,
  idleHoverClassName,
  onClick,
  disabled = false,
  style,
}: EventQuickActionButtonProps) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      initial="rest"
      whileHover={disabled ? "rest" : "hover"}
      whileTap={disabled ? "rest" : "tap"}
      variants={{
        rest: {
          y: 0,
          scale: 1,
          boxShadow: "0 10px 28px rgba(53, 59, 51, 0.08)",
        },
        hover: {
          y: -4,
          scale: 1.015,
          boxShadow: "0 18px 36px rgba(53, 59, 51, 0.14)",
        },
        tap: {
          y: -1,
          scale: 0.975,
          boxShadow: "0 8px 18px rgba(53, 59, 51, 0.12)",
        },
      }}
      transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.9 }}
      className={`group relative flex min-h-[88px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[22px] border border-white/70 bg-off-white/90 px-3 py-4 text-charcoal/80 backdrop-blur-md ${active ? activeClassName : idleHoverClassName} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      style={style}
    >
      <m.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_62%)] opacity-80"
      />
      <m.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-[-35%] w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent"
        variants={{
          rest: { x: "-150%", opacity: 0 },
          hover: { x: "260%", opacity: 1 },
          tap: { x: "260%", opacity: 0.65 },
        }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
      <span className="relative z-10 flex items-center justify-center">{icon}</span>
      <span
        className="relative z-10 text-[11px] font-semibold leading-none tracking-[0.16em]"
        style={style}
      >
        {label}
      </span>
    </m.button>
  );
}

export default function EventActionCard({
  eventId,
  hasReviewed = false,
  bookingUrl,
  ticketmasterUrl,
  bookingContact,
  purchaseUrl,
  eventData,
}: EventActionCardProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const { count: rsvpCount, isGoing, toggle: toggleRsvp } = useEventRsvp(eventId ?? '');
  const { hasReminder, toggle: toggleReminder, loading: reminderLoading } = useEventReminder(
    eventId ?? '',
    eventData?.title ?? '',
    eventData?.startDateISO
  );

  const isLikelyPhone = (value?: string) => {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    const digits = trimmed.replace(/[^\d]/g, "");
    return digits.length >= 7 && /^[\d+()\-\s]+$/.test(trimmed);
  };

  const logCtaClick = (payload: { ctaKind: "external_url" | "whatsapp"; ctaSource?: string | null; targetUrl: string }) => {
    if (!eventId) return;
    void fetch(`/api/events-and-specials/${eventId}/cta-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  const handleReserveClick = () => {
    const cleanUrl = (value?: string) => value?.trim() || "";
    const fallbackUrl = cleanUrl(ticketmasterUrl) || cleanUrl(bookingUrl) || cleanUrl(purchaseUrl);

    if (eventData && typeof window !== "undefined") {
      const resolved = resolveCtaTarget({
        event: eventData,
        currentUrl: window.location.href,
        ctaSource: eventData.ctaSource ?? null,
        bookingUrl: cleanUrl(eventData.bookingUrl) || fallbackUrl,
        whatsappNumber: eventData.whatsappNumber ?? null,
        whatsappPrefillTemplate: eventData.whatsappPrefillTemplate ?? null,
      });
      if (resolved.url) {
        window.open(resolved.url, "_blank", "noopener,noreferrer");
        logCtaClick({ ctaKind: resolved.ctaKind, ctaSource: resolved.ctaSource, targetUrl: resolved.url });
        return;
      }
    }
    if (fallbackUrl) {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      logCtaClick({ ctaKind: "external_url", ctaSource: eventData?.ctaSource ?? null, targetUrl: fallbackUrl });
      return;
    }
    if (bookingContact) { showToast?.(bookingContact, "info"); return; }
    showToast?.("Booking link not available yet.", "info");
  };

  const handleCalendar = () => {
    if (!eventData) return;
    downloadICS({
      id: eventData.id,
      title: eventData.title,
      startDateISO: eventData.startDateISO,
      endDateISO: eventData.endDateISO,
      location: eventData.location,
      description: eventData.description,
      url: eventData.bookingUrl || eventData.url,
    });
    showToast?.("Calendar event downloaded!", "success", 2000);
  };

  const handleShare = async () => {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${eventData?.href ?? `/event/${eventId}`}`;
    const shareText = `Check out ${eventData?.title ?? "this event"} on sayso!`;
    try {
      if (navigator.share && navigator.canShare?.({ title: eventData?.title, text: shareText, url: shareUrl })) {
        await navigator.share({ title: eventData?.title, text: shareText, url: shareUrl });
        showToast?.("Shared successfully!", "success", 2000);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast?.("Link copied to clipboard!", "success", 2000);
      }
    } catch {
      showToast?.("Failed to share.", "info", 3000);
    }
  };

  const handleReminderOption = async (option: RemindBefore) => {
    if (!user) {
      showToast?.("Sign in to set reminders", "info", 3000);
      setShowReminderPicker(false);
      return;
    }
    if (!eventData?.startDateISO) {
      showToast?.("Event date unavailable", "info", 2000);
      setShowReminderPicker(false);
      return;
    }
    try {
      const isNowActive = await toggleReminder(option);
      const label = option === '1_day' ? '1 day before' : '2 hours before';
      showToast?.(
        isNowActive ? `Reminder set for ${label}` : `Reminder removed`,
        "success",
        2500
      );
    } catch (e: any) {
      showToast?.(e?.message ?? "Could not set reminder", "info", 3000);
    }
    setShowReminderPicker(false);
  };

  const fontStyle = { fontFamily: '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' };

  return (
    <m.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6 relative overflow-visible"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg" />

      <div className="relative z-10">
        <h3 className="text-h3 font-semibold text-charcoal mb-3" style={fontStyle}>
          Join This Event
        </h3>

        <div className="space-y-3">
          {/* Primary CTA */}
          <m.button
            type="button"
            onClick={handleReserveClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:bg-navbar-bg border border-white/30 shadow-md text-body-sm"
            style={fontStyle}
          >
            {!isLikelyPhone(bookingContact) && bookingContact?.trim() ? bookingContact.trim() : "Reserve Your Spot"}
          </m.button>

          {/* Engagement row: Going · Remind · Calendar · Share */}
          <div className="grid grid-cols-2 gap-3">
            <EventQuickActionButton
              onClick={() => eventId && toggleRsvp()}
              active={isGoing}
              activeClassName="border-coral/35 text-coral"
              idleHoverClassName="hover:border-coral/25 hover:text-coral"
              ariaLabel={isGoing ? "Remove Going" : "Mark as Going"}
              label={rsvpCount > 0 ? String(rsvpCount) : "Going"}
              icon={<Users className={`h-5 w-5 transition-transform duration-300 ${isGoing ? "scale-110" : ""}`} strokeWidth={isGoing ? 2.35 : 1.9} />}
              style={fontStyle}
            />

            <div className={`relative ${showReminderPicker ? "z-[210]" : "z-10"}`}>
              <EventQuickActionButton
                onClick={() => setShowReminderPicker((p) => !p)}
                active={hasReminder('1_day') || hasReminder('2_hours')}
                activeClassName="border-amber-300/70 text-amber-600"
                idleHoverClassName="hover:border-amber-300/40 hover:text-amber-600"
                ariaLabel="Set reminder"
                label="Remind"
                icon={<Bell className={`h-5 w-5 transition-transform duration-300 ${hasReminder('1_day') || hasReminder('2_hours') ? "scale-110" : ""}`} strokeWidth={hasReminder('1_day') || hasReminder('2_hours') ? 2.35 : 1.9} />}
                style={fontStyle}
              />

              <AnimatePresence>
                {showReminderPicker && (
                  <m.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute bottom-full left-1/2 z-[220] mb-3 min-w-[196px] -translate-x-1/2 rounded-[22px] border border-white/80 bg-off-white/95 p-2.5 shadow-[0_28px_70px_rgba(35,39,34,0.24)] backdrop-blur-xl"
                  >
                    <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal/45" style={fontStyle}>Remind me</p>
                    <button
                      type="button"
                      onClick={() => handleReminderOption('1_day')}
                      disabled={reminderLoading}
                      className={`w-full flex items-center justify-between gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-150 ${
                        hasReminder('1_day')
                          ? 'border border-amber-200 bg-amber-50/90 text-amber-700'
                          : 'text-charcoal/75 hover:bg-charcoal/5'
                      }`}
                      style={fontStyle}
                    >
                      1 day before
                      {hasReminder('1_day') && <Check className="h-3.5 w-3.5 text-amber-700" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReminderOption('2_hours')}
                      disabled={reminderLoading}
                      className={`w-full flex items-center justify-between gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-150 ${
                        hasReminder('2_hours')
                          ? 'border border-amber-200 bg-amber-50/90 text-amber-700'
                          : 'text-charcoal/75 hover:bg-charcoal/5'
                      }`}
                      style={fontStyle}
                    >
                      2 hours before
                      {hasReminder('2_hours') && <Check className="h-3.5 w-3.5 text-amber-700" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReminderPicker(false)}
                      className="mt-1 flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs text-charcoal/40 transition-colors hover:text-charcoal/60"
                      style={fontStyle}
                    >
                      <X className="mr-1 h-3 w-3" /> Close
                    </button>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <EventQuickActionButton
              onClick={handleCalendar}
              activeClassName="border-sage/35 text-sage"
              idleHoverClassName="hover:border-sage/30 hover:text-sage"
              ariaLabel="Add to calendar"
              label="Calendar"
              icon={<Calendar className="h-5 w-5" strokeWidth={1.9} />}
              style={fontStyle}
            />

            <EventQuickActionButton
              onClick={handleShare}
              activeClassName="border-navbar-bg/30 text-navbar-bg"
              idleHoverClassName="hover:border-navbar-bg/30 hover:text-navbar-bg"
              ariaLabel="Share event"
              label="Share"
              icon={<Share2 className="h-5 w-5" strokeWidth={1.9} />}
              style={fontStyle}
            />
          </div>

          {/* Write Review */}
          {eventId && (
            <m.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={`/write-review/event/${eventId}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-coral to-coral/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:scale-105 border border-white/30 shadow-md text-body-sm"
                style={fontStyle}
              >
                Write Review
              </Link>
            </m.div>
          )}
        </div>
      </div>
    </m.div>
  );
}





