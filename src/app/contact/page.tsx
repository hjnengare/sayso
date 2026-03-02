"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from "@/app/lib/icons";
import { m, AnimatePresence } from "framer-motion";
import Footer from "../components/Footer/Footer";

const FONT = "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const CONTACT_REASONS = [
  { value: "general", label: "General enquiry" },
  { value: "business", label: "Business listing / claim" },
  { value: "partnership", label: "Partnership or press" },
  { value: "bug", label: "Bug or technical issue" },
  { value: "feedback", label: "Feedback or suggestion" },
  { value: "other", label: "Something else" },
];

const MESSAGE_MAX = 1000;
const MESSAGE_MIN = 10;
const NAME_MIN = 2;

function validateName(v: string) {
  if (!v.trim()) return "Please enter your name.";
  if (v.trim().length < NAME_MIN) return "Name must be at least 2 characters.";
  if (!/^[\p{L}\p{M}'\- ]+$/u.test(v.trim())) return "Name contains invalid characters.";
  return null;
}

function validateEmail(v: string) {
  if (!v.trim()) return "Please enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Please enter a valid email address.";
  return null;
}

function validateMessage(v: string) {
  if (!v.trim()) return "Please enter a message.";
  if (v.trim().length < MESSAGE_MIN) return `Message must be at least ${MESSAGE_MIN} characters.`;
  return null;
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", reason: "general", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, email: false, message: false });

  const errors = {
    name: validateName(form.name),
    email: validateEmail(form.email),
    message: validateMessage(form.message),
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "message" && value.length > MESSAGE_MAX) return;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (status === "error") {
      setStatus("idle");
      setErrorMessage(null);
    }
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, message: true });
    if (errors.name || errors.email || errors.message) return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Unknown error");
      }

      setStatus("success");
      setForm({ name: "", email: "", reason: "general", message: "" });
      setTouched({ name: false, email: false, message: false });
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage(
        err instanceof Error && err.message !== "Unknown error"
          ? err.message
          : "Something went wrong. Please try again or email us at info@sayso.co.za."
      );
    }
  };

  const isNameInvalid = touched.name && !!errors.name;
  const isEmailInvalid = touched.email && !!errors.email;
  const isMessageInvalid = touched.message && !!errors.message;
  const isNameValid = touched.name && !errors.name;
  const isEmailValid = touched.email && !errors.email;
  const canSubmit = !errors.name && !errors.email && !errors.message;

  const charCount = form.message.length;
  const charNearLimit = charCount > MESSAGE_MAX * 0.8;
  const charAtLimit = charCount >= MESSAGE_MAX;

  return (
    <div className="min-h-dvh bg-navbar-bg" style={{ fontFamily: FONT }}>

      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-6 pb-0">
        <nav className="flex items-center gap-2 text-sm text-white/50" aria-label="Breadcrumb">
          <Link href="/home" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">Contact</span>
        </nav>
      </div>

      {/* Page heading */}
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-8 pb-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight">
          Contact us
        </h1>
        <p className="mt-2 text-sm text-white/50">
          We typically respond within 24–48 hours.
        </p>
      </div>

      {/* Body */}
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-12">
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <m.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[16px] border border-white/20 bg-white/10 px-6 py-14 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">Message sent!</h3>
              <p className="text-sm text-white/70 max-w-xs mx-auto mb-7 leading-relaxed">
                We've received your message and sent you a confirmation. We'll get back to you within 24–48 hours.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-navbar-bg text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm"
              >
                Send another message
              </button>
            </m.div>
          ) : (
            <m.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-5"
              noValidate
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-name" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Full name <span className="text-white/40 normal-case tracking-normal">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      onBlur={() => handleBlur("name")}
                      placeholder="Your name"
                      className={`w-full rounded-full border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 transition pr-9 ${
                        isNameInvalid
                          ? "border-red-400/60 focus:ring-red-400/20 focus:border-red-400/80"
                          : isNameValid
                          ? "border-emerald-400/50 focus:ring-emerald-400/20 focus:border-emerald-400/70"
                          : "border-white/20 focus:ring-white/20 focus:border-white/40"
                      }`}
                    />
                    <AnimatePresence>
                      {isNameValid && (
                        <m.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                        </m.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <AnimatePresence>
                    {isNameInvalid && (
                      <m.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="text-xs text-red-400 font-medium flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.name}
                      </m.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-email" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Email address <span className="text-white/40 normal-case tracking-normal">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      onBlur={() => handleBlur("email")}
                      placeholder="you@example.com"
                      className={`w-full rounded-full border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 transition pr-9 ${
                        isEmailInvalid
                          ? "border-red-400/60 focus:ring-red-400/20 focus:border-red-400/80"
                          : isEmailValid
                          ? "border-emerald-400/50 focus:ring-emerald-400/20 focus:border-emerald-400/70"
                          : "border-white/20 focus:ring-white/20 focus:border-white/40"
                      }`}
                    />
                    <AnimatePresence>
                      {isEmailValid && (
                        <m.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                        </m.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <AnimatePresence>
                    {isEmailInvalid && (
                      <m.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="text-xs text-red-400 font-medium flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.email}
                      </m.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-reason" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  How can we help?
                </label>
                <select
                  id="contact-reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 transition"
                >
                  {CONTACT_REASONS.map((r) => (
                    <option key={r.value} value={r.value} className="text-charcoal bg-white">{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="contact-message" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Message <span className="text-white/40 normal-case tracking-normal">*</span>
                  </label>
                  <span className={`text-xs tabular-nums transition-colors ${
                    charAtLimit ? "text-red-400 font-semibold" : charNearLimit ? "text-amber-400" : "text-white/35"
                  }`}>
                    {charCount}/{MESSAGE_MAX}
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={6}
                  value={form.message}
                  onChange={handleChange}
                  onBlur={() => handleBlur("message")}
                  placeholder="Tell us what's on your mind…"
                  className={`w-full rounded-[10px] border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 transition resize-none ${
                    isMessageInvalid
                      ? "border-red-400/60 focus:ring-red-400/20 focus:border-red-400/80"
                      : "border-white/20 focus:ring-white/20 focus:border-white/40"
                  }`}
                />
                <AnimatePresence>
                  {isMessageInvalid && (
                    <m.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs text-red-400 font-medium flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.message}
                    </m.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Error banner */}
              <AnimatePresence>
                {status === "error" && errorMessage && (
                  <m.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-3 rounded-[10px] border border-red-400/30 bg-red-500/10 px-4 py-3"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300 leading-snug">{errorMessage}</p>
                  </m.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 pt-1">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-navbar-bg text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>Send message <Send className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </m.form>
          )}
        </AnimatePresence>
      </section>

      <Footer />
    </div>
  );
}
