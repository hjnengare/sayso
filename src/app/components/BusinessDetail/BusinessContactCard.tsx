"use client";

import { m } from "framer-motion";
import { useMemo, useState } from "react";
import { Check, Copy, Loader2 } from "@/app/lib/icons";

interface BusinessContactCardProps {
  businessId: string;
  businessName: string;
  phone?: string | null;
}

type SubmitState = "idle" | "loading" | "success" | "error";

const DEFAULT_MESSAGE = "I\u2019m interested in this business, please contact me.";
const NAME_MIN = 2;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const MOBILE_MIN_DIGITS = 7;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 500;
const CONTACT_API_MESSAGE_MAX = 1000;

function normalizeDigits(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= MOBILE_MIN_DIGITS ? digits : null;
}

function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Name is required.";
  if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) {
    return `Name must be between ${NAME_MIN} and ${NAME_MAX} characters.`;
  }
  return null;
}

function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (trimmed.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

function validateMobile(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Mobile is required.";
  const digits = normalizeDigits(trimmed);
  if (!digits) return "Enter a valid mobile number.";
  return null;
}

function validateMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Message is required.";
  if (trimmed.length < MESSAGE_MIN || trimmed.length > MESSAGE_MAX) {
    return `Message must be between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters.`;
  }
  return null;
}

export default function BusinessContactCard({ businessId, businessName, phone }: BusinessContactCardProps) {
  const contactPhone = useMemo(() => {
    if (typeof phone !== "string") return null;
    const trimmed = phone.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [phone]);

  const whatsappNumber = useMemo(() => normalizeDigits(contactPhone), [contactPhone]);

  const [showPhone, setShowPhone] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    mobile: false,
    message: false,
  });
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    message: DEFAULT_MESSAGE,
  });

  const errors = {
    name: validateName(form.name),
    email: validateEmail(form.email),
    mobile: validateMobile(form.mobile),
    message: validateMessage(form.message),
  };

  const hasErrors = Boolean(errors.name || errors.email || errors.mobile || errors.message);
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I\u2019m interested in ${businessName}. Please contact me.`)}`
    : null;

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (submitState !== "idle") {
      setSubmitState("idle");
      setSubmitMessage(null);
    }
  };

  const handleCopyPhone = async () => {
    if (!contactPhone) return;
    try {
      await navigator.clipboard.writeText(contactPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      setCopiedPhone(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({
      name: true,
      email: true,
      mobile: true,
      message: true,
    });

    if (hasErrors) return;

    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    const composedMessage = [
      "Business Inquiry",
      `Business: ${businessName}`,
      `Business ID: ${businessId}`,
      pageUrl ? `Business Page: ${pageUrl}` : null,
      `Mobile: ${form.mobile.trim()}`,
      "",
      form.message.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    if (composedMessage.length > CONTACT_API_MESSAGE_MAX) {
      setSubmitState("error");
      setSubmitMessage("Message is too long. Please shorten it and try again.");
      return;
    }

    setSubmitState("loading");
    setSubmitMessage(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          reason: "business",
          message: composedMessage,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        }
        if (response.status >= 500) {
          throw new Error("Could not send your inquiry right now. Please try again later.");
        }
        throw new Error(typeof data?.error === "string" ? data.error : "Could not send inquiry. Please check your details.");
      }

      setSubmitState("success");
      setSubmitMessage("Inquiry sent successfully. We'll get back to you soon.");
      setForm({
        name: "",
        email: "",
        mobile: "",
        message: DEFAULT_MESSAGE,
      });
      setTouched({
        name: false,
        email: false,
        mobile: false,
        message: false,
      });
    } catch {
      setSubmitState("error");
      setSubmitMessage("Unable to submit your inquiry right now. Please try again later.");
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.55, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6"
    >
      <h3
        className="text-h3 font-semibold text-charcoal mb-3"
        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
      >
        Contact
      </h3>

      <div className="space-y-3">
        <button
          type="button"
          disabled={!contactPhone}
          onClick={() => setShowPhone(true)}
          className="w-full rounded-full border border-white/40 bg-off-white/80 px-4 py-2.5 text-body-sm font-semibold text-charcoal transition-colors hover:bg-off-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
        >
          Show Contact Number
        </button>

        {showPhone && contactPhone && (
          <div className="flex items-center gap-2 rounded-full bg-white/40 px-4 py-2.5">
            <a
              href={`tel:${contactPhone}`}
              className="min-w-0 flex-1 truncate text-body-sm text-charcoal/80 hover:text-charcoal transition-colors"
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              {contactPhone}
            </a>
            <button
              type="button"
              onClick={handleCopyPhone}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-off-white/80 text-charcoal/80 transition-colors hover:bg-off-white"
              aria-label="Copy contact number"
            >
              {copiedPhone ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {!contactPhone && (
          <p
            className="text-xs text-charcoal/60 italic"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            Contact number unavailable for this business.
          </p>
        )}

        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-full bg-navbar-bg px-4 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-navbar-bg/90"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="w-full rounded-full border border-white/40 bg-off-white/50 px-4 py-2.5 text-body-sm font-semibold text-charcoal/60"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            WhatsApp
          </button>
        )}

        {!whatsappHref && (
          <p
            className="text-xs text-charcoal/60 italic"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            WhatsApp is unavailable for this business.
          </p>
        )}
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit} noValidate>
        <div>
          <input
            type="text"
            value={form.name}
            onChange={(event) => handleInputChange("name", event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            maxLength={NAME_MAX}
            placeholder="Name"
            className="w-full rounded-full border border-white/25 bg-white/70 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/50 focus:border-white/50 focus:outline-none"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          />
          {touched.name && errors.name && (
            <p className="mt-1 text-xs text-red-700">{errors.name}</p>
          )}
        </div>

        <div>
          <input
            type="email"
            value={form.email}
            onChange={(event) => handleInputChange("email", event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            maxLength={EMAIL_MAX}
            placeholder="Email"
            className="w-full rounded-full border border-white/25 bg-white/70 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/50 focus:border-white/50 focus:outline-none"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          />
          {touched.email && errors.email && (
            <p className="mt-1 text-xs text-red-700">{errors.email}</p>
          )}
        </div>

        <div>
          <input
            type="tel"
            value={form.mobile}
            onChange={(event) => handleInputChange("mobile", event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, mobile: true }))}
            maxLength={32}
            placeholder="Mobile"
            className="w-full rounded-full border border-white/25 bg-white/70 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/50 focus:border-white/50 focus:outline-none"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          />
          {touched.mobile && errors.mobile && (
            <p className="mt-1 text-xs text-red-700">{errors.mobile}</p>
          )}
        </div>

        <div>
          <textarea
            value={form.message}
            onChange={(event) => handleInputChange("message", event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, message: true }))}
            minLength={MESSAGE_MIN}
            maxLength={MESSAGE_MAX}
            rows={4}
            placeholder="Message"
            className="w-full rounded-[12px] border border-white/25 bg-white/70 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/50 focus:border-white/50 focus:outline-none resize-none"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          />
          {touched.message && errors.message && (
            <p className="mt-1 text-xs text-red-700">{errors.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitState === "loading"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-coral px-4 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-70"
          style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
        >
          {submitState === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Submit"
          )}
        </button>

        {submitMessage && (
          <p className={`text-xs ${submitState === "success" ? "text-emerald-700" : "text-red-700"}`}>
            {submitMessage}
          </p>
        )}
      </form>
    </m.div>
  );
}

