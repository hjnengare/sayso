"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { getBrowserSupabase } from "../../lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft,
  Store,
  UserCheck,
  Mail,
  Phone,
  Building2,
  FileText,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { Loader } from "../../components/Loader";

const FONT = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const ERROR_CODE_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Please log in to claim this business.",
  MISSING_FIELDS: "Please fill in all required details.",
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_PHONE: "Please enter a valid phone number.",
  EMAIL_DOMAIN_MISMATCH:
    "This email doesn't match the business website domain. Use an official business email.",
  DUPLICATE_CLAIM: "You already have a claim in progress for this business.",
  ALREADY_OWNER: "You already own this business.",
  BUSINESS_NOT_FOUND: "We couldn't find that business. Please try again.",
  RLS_BLOCKED: "We couldn't process your claim right now. Please try again.",
  DB_ERROR: "We couldn't process your claim right now. Please try again.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
};

function getErrorMessage(result: { message?: string; code?: string; error?: string }): string {
  if (result.message) return result.message;
  if (result.code && ERROR_CODE_MESSAGES[result.code]) {
    return ERROR_CODE_MESSAGES[result.code];
  }
  if (result.error) return result.error;
  return "An error occurred. Please try again.";
}

interface BusinessData {
  id: string;
  name: string;
  category: string;
  location: string;
  phone?: string;
  email?: string;
  website?: string;
}

export default function ClaimBusinessFormPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const businessId = params?.businessId as string;

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    role: "owner" as "owner" | "manager",
    phone: "",
    email: "",
    note: "",
    cipc_registration_number: "",
    cipc_company_name: "",
  });

  // Fetch business details
  useEffect(() => {
    if (!businessId) return;

    const fetchBusiness = async () => {
      setLoading(true);
      try {
        const supabase = getBrowserSupabase();
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, primary_subcategory_label, location, phone, email, website")
          .eq("id", businessId)
          .maybeSingle();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        setBusiness({
          id: data.id,
          name: data.name || "Unnamed Business",
          category: data.primary_subcategory_label || "Business",
          location: data.location || "",
          phone: data.phone || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
        });

        // Pre-fill form with business data
        setFormData((prev) => ({
          ...prev,
          phone: data.phone || "",
          email: data.email || user?.email || "",
        }));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void fetchBusiness();
  }, [businessId, user?.email]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=/claim-business/${businessId}`);
    }
  }, [authLoading, user, router, businessId]);

  useEffect(() => {
    if (formError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current.focus();
    }
  }, [formError]);

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormError(null);
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !business) return;
    setFormError(null);

    if (!user) {
      setFormError("Please log in to claim this business.");
      return;
    }

    const hasContact =
      formData.email?.trim() ||
      formData.phone?.trim() ||
      (formData.cipc_registration_number?.trim() && formData.cipc_company_name?.trim());

    if (!hasContact) {
      setFormError("Please provide a business email, phone number, or CIPC details.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/business/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          role: formData.role,
          phone: formData.phone?.trim() || undefined,
          email: formData.email?.trim() || undefined,
          note: formData.note?.trim() || undefined,
          cipc_registration_number: formData.cipc_registration_number?.trim() || undefined,
          cipc_company_name: formData.cipc_company_name?.trim() || undefined,
        }),
      });

      let result: Record<string, unknown>;
      try {
        result = await response.json();
      } catch {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      if (!response.ok || result.success === false) {
        const errorMessage = getErrorMessage(result as { message?: string; code?: string; error?: string });
        setFormError(errorMessage);
        return;
      }

      if (result.status === "verified") {
        showToast(
          (result.message as string) || "Business verified. You can now manage your listing.",
          "success",
          5000,
        );
        router.push(`/my-businesses/businesses/${business.id}`);
        return;
      }

      showToast(
        (result.message as string) || (result.display_status as string) || "Claim submitted. Complete the requested verification step.",
        "success",
        5000,
      );
      router.push("/claim-business");
    } catch (error) {
      console.error("Error submitting claim:", error);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidContact =
    formData.email?.trim() ||
    formData.phone?.trim() ||
    (formData.cipc_registration_number?.trim() && formData.cipc_company_name?.trim());

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-dvh bg-off-white flex items-center justify-center">
        <Loader size="lg" variant="wavy" color="sage" />
      </div>
    );
  }

  // Not found
  if (notFound || !business) {
    return (
      <div className="min-h-dvh bg-off-white">
        <div className="mx-auto max-w-[640px] px-4 py-12 text-center">
          <div className="w-14 h-14 bg-charcoal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-6 h-6 text-charcoal/50" />
          </div>
          <h1
            className="text-lg font-semibold text-charcoal mb-2"
            style={{ fontFamily: FONT }}
          >
            Business not found
          </h1>
          <p
            className="text-base text-charcoal/70 mb-6"
            style={{ fontFamily: FONT }}
          >
            We couldn&apos;t find that business. It may have been removed or the link is incorrect.
          </p>
          <Link
            href="/claim-business"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sage text-white text-sm font-semibold hover:bg-sage/90 transition-colors"
            style={{ fontFamily: FONT }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Claim Business
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white">
      <main className="mx-auto w-full max-w-[2000px] px-4">
        {/* Back navigation */}
        <div className="pt-4 pb-2">
          <Link
            href="/claim-business"
            className="inline-flex items-center gap-1.5 text-sm text-charcoal/70 hover:text-charcoal transition-colors"
            style={{ fontFamily: FONT }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to search
          </Link>
        </div>

        <div className="max-w-[640px] mx-auto pb-12">
          {/* Header */}
          <div className="py-8 text-center">
            <div className="w-14 h-14 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-sage/20">
              <Store className="w-6 h-6 text-sage" />
            </div>
            <h1
              className="text-xl font-bold text-charcoal mb-1"
              style={{ fontFamily: FONT }}
            >
              Claim Business
            </h1>
            <p
              className="text-base text-charcoal/70"
              style={{ fontFamily: FONT }}
            >
              Verify your ownership or management role
            </p>
          </div>

          {/* Business info card */}
          <div className="bg-sage rounded-[12px] p-4 mb-6 border border-sage/20">
            <h2
              className="text-base font-semibold text-white mb-1"
              style={{ fontFamily: FONT }}
            >
              {business.name}
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-white/90" style={{ fontFamily: FONT }}>
              <span>{business.category}</span>
              {business.location && (
                <>
                  <span className="text-white/60">·</span>
                  <MapPin className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
                  <span>{business.location}</span>
                </>
              )}
            </div>
          </div>

          {/* Claim form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role */}
            <div className="space-y-3">
              <label
                className="text-sm font-semibold text-charcoal flex items-center gap-2"
                style={{ fontFamily: FONT }}
              >
                <UserCheck className="w-4 h-4 text-sage" />
                Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData({ role: "owner" })}
                  className={`px-4 py-3 rounded-[10px] border-2 transition-all text-sm font-semibold ${
                    formData.role === "owner"
                      ? "border-sage bg-sage/10 text-sage"
                      : "border-charcoal/15 bg-white text-charcoal/70 hover:border-charcoal/30"
                  }`}
                  style={{ fontFamily: FONT }}
                >
                  Owner
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData({ role: "manager" })}
                  className={`px-4 py-3 rounded-[10px] border-2 transition-all text-sm font-semibold ${
                    formData.role === "manager"
                      ? "border-sage bg-sage/10 text-sage"
                      : "border-charcoal/15 bg-white text-charcoal/70 hover:border-charcoal/30"
                  }`}
                  style={{ fontFamily: FONT }}
                >
                  Manager
                </button>
              </div>
            </div>

            {/* Business email */}
            <div>
              <label
                htmlFor="claim-email"
                className="text-sm font-semibold text-charcoal flex items-center gap-2 mb-2"
                style={{ fontFamily: FONT }}
              >
                <Mail className="w-4 h-4 text-sage" />
                Business Email (optional)
              </label>
              <input
                id="claim-email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData({ email: e.target.value })}
                placeholder="info@business.co.za"
                className="w-full px-4 py-3 rounded-[10px] border border-charcoal/15 bg-white text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-sage/50 focus:ring-1 focus:ring-sage/20 transition-colors text-sm"
                style={{ fontFamily: FONT }}
              />
              <p
                className="text-sm text-charcoal/50 mt-1.5"
                style={{ fontFamily: FONT }}
              >
                Match website domain to auto-verify
              </p>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="claim-phone"
                className="text-sm font-semibold text-charcoal flex items-center gap-2 mb-2"
                style={{ fontFamily: FONT }}
              >
                <Phone className="w-4 h-4 text-sage" />
                Phone (optional)
              </label>
              <input
                id="claim-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
                placeholder="Business phone for OTP"
                className="w-full px-4 py-3 rounded-[10px] border border-charcoal/15 bg-white text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-sage/50 focus:ring-1 focus:ring-sage/20 transition-colors text-sm"
                style={{ fontFamily: FONT }}
              />
            </div>

            {/* CIPC */}
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-charcoal flex items-center gap-2"
                style={{ fontFamily: FONT }}
              >
                <Building2 className="w-4 h-4 text-sage" />
                CIPC (optional)
              </label>
              <input
                type="text"
                value={formData.cipc_registration_number}
                onChange={(e) => updateFormData({ cipc_registration_number: e.target.value })}
                placeholder="Company registration number"
                className="w-full px-4 py-3 rounded-[10px] border border-charcoal/15 bg-white text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-sage/50 focus:ring-1 focus:ring-sage/20 transition-colors text-sm"
                style={{ fontFamily: FONT }}
              />
              <input
                type="text"
                value={formData.cipc_company_name}
                onChange={(e) => updateFormData({ cipc_company_name: e.target.value })}
                placeholder="Registered company name"
                className="w-full px-4 py-3 rounded-[10px] border border-charcoal/15 bg-white text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-sage/50 focus:ring-1 focus:ring-sage/20 transition-colors text-sm"
                style={{ fontFamily: FONT }}
              />
              <p
                className="text-sm text-charcoal/50"
                style={{ fontFamily: FONT }}
              >
                For manual CIPC review; no documents required
              </p>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="claim-notes"
                className="text-sm font-semibold text-charcoal flex items-center gap-2 mb-2"
                style={{ fontFamily: FONT }}
              >
                <FileText className="w-4 h-4 text-sage" />
                Additional Notes (optional)
              </label>
              <textarea
                id="claim-notes"
                value={formData.note}
                onChange={(e) => updateFormData({ note: e.target.value })}
                placeholder="Tell us about your relationship with this business..."
                rows={4}
                className="w-full px-4 py-3 rounded-[10px] border border-charcoal/15 bg-white text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-sage/50 focus:ring-1 focus:ring-sage/20 transition-colors resize-none text-sm"
                style={{ fontFamily: FONT }}
              />
            </div>

            {/* Error */}
            {formError && (
              <div
                ref={errorRef}
                role="alert"
                tabIndex={-1}
                className="flex items-start gap-3 p-4 rounded-[10px] bg-coral/10 border border-coral/30 text-coral"
                style={{ fontFamily: FONT }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{formError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/claim-business"
                className="flex-1 px-4 py-3 rounded-full border-2 border-charcoal/15 text-charcoal text-sm font-semibold hover:bg-charcoal/5 transition-colors text-center"
                style={{ fontFamily: FONT }}
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !hasValidContact}
                className="flex-1 px-4 py-3 rounded-full bg-gradient-to-br from-coral to-coral/90 text-white text-sm font-semibold hover:from-coral/90 hover:to-coral/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ fontFamily: FONT }}
              >
                {isSubmitting ? (
                  <>
                    <Loader size="sm" variant="wavy" color="white" />
                    Starting claim...
                  </>
                ) : (
                  "Submit Claim"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
