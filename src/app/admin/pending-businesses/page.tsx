"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Store, CheckCircle, XCircle } from "lucide-react";

const FONT = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

type PendingBusiness = {
  id: string;
  name: string;
  slug: string | null;
  location: string | null;
  primary_subcategory_label: string | null;
  created_at: string;
  owner_id: string | null;
};

export default function AdminPendingBusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [disapprovingId, setDisapprovingId] = useState<string | null>(null);
  const [disapproveReason, setDisapproveReason] = useState("");
  const [disapproveModalId, setDisapproveModalId] = useState<string | null>(null);

  const fetchPending = () => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/businesses/pending")
      .then((res) => {
        if (res.status === 403) {
          router.replace("/");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load pending businesses");
        return res.json();
      })
      .then((data) => {
        if (data?.businesses) setBusinesses(data.businesses);
      })
      .catch((err) => setError(err.message || "Something went wrong"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, [router]);

  const handleApprove = async (businessId: string) => {
    setApprovingId(businessId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/approve`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setApprovingId(null);
    }
  };

  const openDisapproveModal = (businessId: string) => {
    setDisapproveModalId(businessId);
    setDisapproveReason("");
  };

  const handleDisapprove = async () => {
    if (!disapproveModalId) return;
    setDisapprovingId(disapproveModalId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/businesses/${disapproveModalId}/disapprove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disapproveReason || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to disapprove");
      setBusinesses((prev) => prev.filter((b) => b.id !== disapproveModalId));
      setDisapproveModalId(null);
      setDisapproveReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disapprove");
    } finally {
      setDisapprovingId(null);
    }
  };

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-charcoal" style={{ fontFamily: FONT }}>
            Pending Businesses
          </h1>
          <p className="text-sm text-charcoal/60 mt-1" style={{ fontFamily: FONT }}>
            New businesses awaiting approval before going live
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-charcoal/70 hover:text-charcoal"
          style={{ fontFamily: FONT }}
        >
          ← Back to Admin
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-charcoal/70 py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span style={{ fontFamily: FONT }}>Loading…</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm mb-6" style={{ fontFamily: FONT }}>
          {error}
        </div>
      )}

      {!loading && !error && businesses.length === 0 && (
        <div className="rounded-lg border border-charcoal/15 bg-off-white/50 p-8 text-center text-charcoal/70" style={{ fontFamily: FONT }}>
          <Store className="w-12 h-12 mx-auto mb-3 text-charcoal/40" />
          <p>No businesses pending approval.</p>
        </div>
      )}

      {/* Disapprove modal */}
      {disapproveModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-labelledby="disapprove-title">
          <div className="rounded-[12px] border border-charcoal/15 bg-white p-6 max-w-md w-full shadow-lg" style={{ fontFamily: FONT }}>
            <h2 id="disapprove-title" className="text-lg font-semibold text-charcoal mb-2">Disapprove business</h2>
            <p className="text-sm text-charcoal/70 mb-4">This business will not go live. You can optionally provide a reason (e.g. for the owner).</p>
            <label className="block text-sm font-medium text-charcoal mb-1">Reason (optional)</label>
            <textarea
              value={disapproveReason}
              onChange={(e) => setDisapproveReason(e.target.value)}
              placeholder="e.g. Duplicate listing, incomplete info"
              className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm min-h-[80px]"
              rows={3}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => { setDisapproveModalId(null); setDisapproveReason(""); }}
                className="px-4 py-2 text-sm font-medium text-charcoal/80 hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisapprove}
                disabled={disapprovingId !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {disapprovingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Disapprove
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && businesses.length > 0 && (
        <div className="rounded-[12px] border border-charcoal/15 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal/15 bg-charcoal/5">
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Name</th>
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Category</th>
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Location</th>
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Submitted</th>
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id} className="border-b border-charcoal/10 hover:bg-charcoal/5">
                  <td className="px-4 py-3 font-medium text-charcoal" style={{ fontFamily: FONT }}>{b.name}</td>
                  <td className="px-4 py-3 text-charcoal/80" style={{ fontFamily: FONT }}>{b.primary_subcategory_label ?? "—"}</td>
                  <td className="px-4 py-3 text-charcoal/80" style={{ fontFamily: FONT }}>{b.location ?? "—"}</td>
                  <td className="px-4 py-3 text-charcoal/70" style={{ fontFamily: FONT }}>{formatDate(b.created_at)}</td>
                  <td className="px-4 py-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(b.id)}
                      disabled={approvingId === b.id || disapprovingId === b.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sage text-white px-4 py-2 text-sm font-semibold hover:bg-sage/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: FONT }}
                    >
                      {approvingId === b.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => openDisapproveModal(b.id)}
                      disabled={approvingId === b.id || disapprovingId === b.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white text-red-700 px-4 py-2 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: FONT }}
                    >
                      {disapprovingId === b.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Disapprove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
