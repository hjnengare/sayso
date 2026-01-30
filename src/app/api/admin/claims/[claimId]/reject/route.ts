import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { getServiceSupabase } from "@/app/lib/admin";
import { isAdmin } from "@/app/lib/admin";
import { EmailService } from "@/app/lib/services/emailService";
import {
  createClaimNotification,
  updateClaimLastNotified,
} from "@/app/lib/claimNotifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "business-verification";

type Params = { claimId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await getServerSupabase(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const claimId = (await params).claimId;
    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));
    const reason: string =
      (body?.reason ?? body?.rejection_reason ?? "")?.toString?.() ?? "";
    const adminNotes: string | null =
      (body?.admin_notes ?? body?.adminNotes ?? null) ?? null;

    const service = getServiceSupabase();

    const { data: claim, error: claimError } = await service
      .from("business_claims")
      .select("id, claimant_user_id, business_id, status")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const claimRow = claim as {
      id: string;
      claimant_user_id: string;
      business_id: string;
      status: string;
    };

    if (claimRow.status === "verified" || claimRow.status === "rejected") {
      return NextResponse.json(
        { error: "Claim already processed" },
        { status: 400 }
      );
    }

    // Delete documents (storage + rows)
    const { data: docs } = await service
      .from("business_claim_documents")
      .select("id, storage_path")
      .eq("claim_id", claimId);

    const docList = (docs ?? []) as Array<{ id: string; storage_path: string }>;

    for (const doc of docList) {
      if (doc.storage_path) {
        await service.storage
          .from(BUCKET)
          .remove([doc.storage_path])
          .catch(() => {});
      }
    }

    await service
      .from("business_claim_documents")
      .delete()
      .eq("claim_id", claimId);

    // Reject via RPC (service types may not include this RPC, so cast to any)
    // RPC args typed as never until generated types (supabase gen types typescript) include verify_business_claim
    const { data: rpcResult, error: rpcError } = await (service as any).rpc(
      "verify_business_claim",
      {
        p_claim_id: claimId,
        p_admin_user_id: user.id,
        p_approved: false,
        p_rejection_reason: reason || null,
        p_admin_notes: adminNotes,
      }
    );

    const rpcOk =
      !!rpcResult &&
      typeof rpcResult === "object" &&
      (rpcResult as any).success === true;

    if (rpcError || !rpcOk) {
      console.error("verify_business_claim reject error:", rpcError, rpcResult);
      return NextResponse.json(
        { error: "Failed to reject claim" },
        { status: 500 }
      );
    }

    // Fetch business name (safe even if null/unknown)
    const { data: businessData } = await service
      .from("businesses")
      .select("name")
      .eq("id", claimRow.business_id)
      .maybeSingle();

    const businessName =
      (businessData &&
      typeof businessData === "object" &&
      "name" in businessData &&
      (businessData as any).name
        ? String((businessData as any).name)
        : null) ?? "your business";

    const claimantId = claimRow.claimant_user_id;

    const { data: profileData } = await service
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", claimantId)
      .maybeSingle();

    const recipientName =
      (profileData &&
      typeof profileData === "object" &&
      ("display_name" in profileData || "username" in profileData)
        ? ((profileData as any).display_name ||
            (profileData as any).username) ??
          undefined
        : undefined) ?? undefined;

    // Get claimant email via service-role admin API
    let recipientEmail: string | undefined;
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: authUser } = await admin.auth.admin.getUserById(claimantId);
      recipientEmail = authUser?.user?.email ?? undefined;
    } catch {
      // ignore
    }

    const message = reason
      ? `Your claim for ${businessName} was not approved. Reason: ${reason}`
      : `Your claim for ${businessName} was not approved. Contact support for details.`;

    await createClaimNotification({
      userId: claimantId,
      claimId,
      type: "claim_status_changed",
      title: "Claim not approved",
      message,
      link: "/claim-business",
    });

    updateClaimLastNotified(claimId).catch(() => {});

    if (recipientEmail) {
      EmailService.sendClaimStatusChangedEmail({
        recipientEmail,
        recipientName,
        businessName: businessName ?? "Your business",
        status: "rejected",
        message,
      }).catch((err) =>
        console.error("Claim rejected email failed:", err)
      );
    }

    return NextResponse.json({ success: true, message: "Claim rejected." });
  } catch (err) {
    console.error("Reject claim error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
