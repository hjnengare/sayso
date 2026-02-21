"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MapPin, MessageSquare, ArrowRight, Send, ChevronRight } from "lucide-react";
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

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", reason: "general", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (status !== "idle") setStatus("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    // Build a mailto link as the submission target (no backend form endpoint yet).
    const subject = encodeURIComponent(`[${CONTACT_REASONS.find(r => r.value === form.reason)?.label ?? form.reason}] – ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nReason: ${CONTACT_REASONS.find(r => r.value === form.reason)?.label ?? form.reason}\n\n${form.message}`);
    window.location.href = `mailto:info@sayso.com?subject=${subject}&body=${body}`;

    // Optimistically show success after a short delay
    setTimeout(() => {
      setStatus("success");
      setForm({ name: "", email: "", reason: "general", message: "" });
    }, 400);
  };

  return (
    <div className="min-h-dvh bg-off-white" style={{ fontFamily: FONT }}>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navbar-bg text-off-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-sage/20 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-64 w-96 rounded-full bg-coral/15 blur-3xl" />
        </div>
        <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-6 py-16 sm:py-24">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-sm text-off-white/60" aria-label="Breadcrumb">
            <Link href="/home" className="hover:text-off-white transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-off-white/90">Contact</span>
          </nav>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-off-white" />
            </div>
            <span className="text-sm font-semibold tracking-widest uppercase text-off-white/70">Get in touch</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-off-white leading-tight mb-4">
            We'd love to hear<br className="hidden sm:block" /> from you
          </h1>
          <p className="text-base sm:text-lg text-off-white/75 max-w-xl leading-relaxed">
            Whether it's a question, partnership idea, or feedback — drop us a line and we'll get back to you as soon as we can.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10 lg:gap-16">

          {/* Contact details */}
          <aside className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-charcoal mb-4">Contact details</h2>
              <ul className="flex flex-col gap-4">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 w-9 h-9 rounded-full bg-sage/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-sage" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider mb-0.5">Email</p>
                    <Link
                      href="mailto:info@sayso.com"
                      className="text-sm font-medium text-charcoal hover:text-sage transition-colors"
                    >
                      info@sayso.com
                    </Link>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 w-9 h-9 rounded-full bg-sage/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-sage" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider mb-0.5">Based in</p>
                    <p className="text-sm font-medium text-charcoal">Cape Town, South Africa</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-[12px] bg-sage/8 border border-sage/20 p-4">
              <p className="text-sm font-semibold text-charcoal mb-1">Businesses &amp; claims</p>
              <p className="text-sm text-charcoal/70 leading-relaxed mb-3">
                Want to list or claim your business on Sayso?
              </p>
              <Link
                href="/claim-business"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sage hover:text-sage/80 transition-colors"
              >
                Claim your business <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>

          {/* Form */}
          <div>
            <h2 className="text-lg font-bold text-charcoal mb-6">Send us a message</h2>

            {status === "success" ? (
              <div className="rounded-[14px] border border-sage/30 bg-sage/8 px-6 py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-sage/15 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-6 h-6 text-sage" />
                </div>
                <h3 className="text-lg font-bold text-charcoal mb-2">Message sent!</h3>
                <p className="text-sm text-charcoal/70 mb-6">
                  Your email client should have opened. We'll get back to you soon.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-navbar-bg text-white text-sm font-semibold hover:bg-navbar-bg/90 transition-colors"
                >
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-name" className="text-xs font-semibold text-charcoal/60 uppercase tracking-wider">
                      Your name <span className="text-coral">*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Hilario"
                      className="w-full rounded-[10px] border border-charcoal/15 bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-email" className="text-xs font-semibold text-charcoal/60 uppercase tracking-wider">
                      Email address <span className="text-coral">*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full rounded-[10px] border border-charcoal/15 bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-reason" className="text-xs font-semibold text-charcoal/60 uppercase tracking-wider">
                    Reason
                  </label>
                  <select
                    id="contact-reason"
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    className="w-full rounded-[10px] border border-charcoal/15 bg-white px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition"
                  >
                    {CONTACT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-message" className="text-xs font-semibold text-charcoal/60 uppercase tracking-wider">
                    Message <span className="text-coral">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us what's on your mind..."
                    className="w-full rounded-[10px] border border-charcoal/15 bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition resize-none"
                  />
                </div>

                {status === "error" && errorMsg && (
                  <p className="text-sm text-coral font-medium">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading" || !form.name.trim() || !form.email.trim() || !form.message.trim()}
                  className="self-start inline-flex items-center gap-2 px-7 py-3 rounded-full bg-navbar-bg text-white text-sm font-semibold hover:bg-navbar-bg/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Opening email…" : "Send message"}
                  <Send className="w-4 h-4" />
                </button>

                <p className="text-xs text-charcoal/50">
                  Submitting opens your email client pre-filled with your message.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
