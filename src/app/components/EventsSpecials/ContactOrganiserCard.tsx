"use client";

import { m } from "framer-motion";
import { Globe, Phone, Users, Tag } from "@/app/lib/icons";
import type { QuicketOrganiserInfo } from "@/app/lib/types/Event";

interface ContactOrganiserCardProps {
  organiser?: QuicketOrganiserInfo | null;
  title?: string;
  animationDelay?: number;
}

const toTwitterUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const handle = trimmed.replace(/^@+/, "");
  return `https://x.com/${handle}`;
};

export default function ContactOrganiserCard({
  organiser,
  title = "Contact Organiser",
  animationDelay = 0.6,
}: ContactOrganiserCardProps) {
  const hasData = Boolean(
    organiser?.name
      || organiser?.phone
      || organiser?.mobile
      || organiser?.facebookUrl
      || organiser?.twitterHandle
      || organiser?.hashTag
      || organiser?.organiserPageUrl,
  );

  if (!hasData) return null;

  return (
    <m.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6"
    >
      <h3
        className="text-h3 font-semibold text-charcoal mb-3"
        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
      >
        {title}
      </h3>

      <div className="space-y-3">
        {organiser?.name && (
          <div className="rounded-[12px] bg-off-white/65 p-3">
            <p
              className="text-[11px] uppercase tracking-wide text-charcoal/60"
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Organised by
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Users className="h-4 w-4 text-charcoal/70" />
              <p
                className="text-sm font-semibold text-charcoal"
                style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
              >
                {organiser.name}
              </p>
            </div>
          </div>
        )}

        {(organiser?.phone || organiser?.mobile) && (
          <div className="rounded-[12px] bg-off-white/65 p-3">
            <p
              className="text-[11px] uppercase tracking-wide text-charcoal/60"
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Contact
            </p>
            <div className="mt-1 space-y-1.5">
              {organiser.phone && (
                <a
                  href={`tel:${organiser.phone}`}
                  className="flex items-center gap-2 text-sm text-charcoal/80 hover:text-charcoal"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  <Phone className="h-4 w-4" />
                  {organiser.phone}
                </a>
              )}
              {organiser.mobile && (
                <a
                  href={`tel:${organiser.mobile}`}
                  className="flex items-center gap-2 text-sm text-charcoal/80 hover:text-charcoal"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  <Phone className="h-4 w-4" />
                  {organiser.mobile}
                </a>
              )}
            </div>
          </div>
        )}

        {(organiser?.facebookUrl || organiser?.twitterHandle) && (
          <div className="rounded-[12px] bg-off-white/65 p-3">
            <p
              className="text-[11px] uppercase tracking-wide text-charcoal/60"
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Social
            </p>
            <div className="mt-1 space-y-1.5">
              {organiser.facebookUrl && (
                <a
                  href={organiser.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-navbar-bg hover:text-navbar-bg/80"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  <Globe className="h-4 w-4" />
                  Facebook
                </a>
              )}
              {organiser.twitterHandle && (
                <a
                  href={toTwitterUrl(organiser.twitterHandle)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-navbar-bg hover:text-navbar-bg/80"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  <Globe className="h-4 w-4" />
                  {organiser.twitterHandle.startsWith("@")
                    ? organiser.twitterHandle
                    : `@${organiser.twitterHandle}`}
                </a>
              )}
            </div>
          </div>
        )}

        {organiser?.hashTag && (
          <div className="rounded-[12px] bg-off-white/65 p-3">
            <p
              className="text-[11px] uppercase tracking-wide text-charcoal/60"
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Hashtag
            </p>
            <div className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-charcoal/80">
              <Tag className="h-4 w-4" />
              <span style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                {organiser.hashTag.replace(/^#+/, "#")}
              </span>
            </div>
          </div>
        )}

        {organiser?.organiserPageUrl && (
          <a
            href={organiser.organiserPageUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-navbar-bg text-white px-4 py-2.5 text-sm font-semibold hover:bg-navbar-bg/90"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            <Globe className="h-4 w-4" />
            Organiser Page
          </a>
        )}
      </div>
    </m.div>
  );
}
