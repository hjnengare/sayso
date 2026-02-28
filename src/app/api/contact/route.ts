import { NextRequest, NextResponse } from "next/server";
import * as postmark from "postmark";

// Simple in-process rate limiter: max 3 submissions per IP per 10 minutes
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const ipTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const hits = (ipTimestamps.get(ip) ?? []).filter((t) => t > windowStart);
  if (hits.length >= RATE_LIMIT_MAX) return true;
  hits.push(now);
  ipTimestamps.set(ip, hits);
  return false;
}

const CONTACT_REASONS: Record<string, string> = {
  general: "General enquiry",
  business: "Business listing / claim",
  partnership: "Partnership or press",
  bug: "Bug or technical issue",
  feedback: "Feedback or suggestion",
  other: "Something else",
};

const ALLOWED_REASONS = new Set(Object.keys(CONTACT_REASONS));
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 1000;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, reason, message } = body as Record<string, unknown>;

  if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const trimName = name.trim();
  const trimEmail = email.trim();
  const trimMessage = message.trim();

  if (!trimName || !trimEmail || !trimMessage) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (trimName.length < 2 || trimName.length > NAME_MAX) {
    return NextResponse.json({ error: "Name must be between 2 and 100 characters." }, { status: 400 });
  }

  if (trimEmail.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  if (trimMessage.length < MESSAGE_MIN || trimMessage.length > MESSAGE_MAX) {
    return NextResponse.json(
      { error: `Message must be between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters.` },
      { status: 400 }
    );
  }

  const resolvedReason = typeof reason === "string" && ALLOWED_REASONS.has(reason) ? reason : "other";

  const apiKey = process.env.NEXT_POSTMARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service not configured." }, { status: 500 });
  }

  const client = new postmark.ServerClient(apiKey);
  const reasonLabel = CONTACT_REASONS[resolvedReason];

  try {
    await client.sendEmail({
      From: "info@sayso.co.za",
      To: "info@sayso.co.za",
      ReplyTo: trimEmail,
      Subject: `[${reasonLabel}] – ${trimName}`,
      TextBody: `Name: ${trimName}\nEmail: ${trimEmail}\nReason: ${reasonLabel}\n\n${trimMessage}`,
      HtmlBody: `
        <p><strong>Name:</strong> ${escapeHtml(trimName)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(trimEmail)}">${escapeHtml(trimEmail)}</a></p>
        <p><strong>Reason:</strong> ${escapeHtml(reasonLabel)}</p>
        <hr />
        <p style="white-space:pre-wrap">${escapeHtml(trimMessage)}</p>
      `,
      MessageStream: "outbound",
    });

    // Auto-reply to the sender
    await client.sendEmail({
      From: "info@sayso.co.za",
      To: trimEmail,
      Subject: "We received your message – Sayso",
      TextBody: `Hi ${trimName},\n\nThanks for reaching out! We received your message and will get back to you within 24–48 hours.\n\nThe Sayso Team`,
      HtmlBody: `
        <p>Hi ${escapeHtml(trimName)},</p>
        <p>Thanks for reaching out! We received your message and will get back to you within 24–48 hours.</p>
        <p>The Sayso Team</p>
      `,
      MessageStream: "outbound",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const postmarkErr = err as { message?: string; statusCode?: number; ErrorCode?: number };
    console.error("Postmark error:", JSON.stringify({ message: postmarkErr?.message, statusCode: postmarkErr?.statusCode, ErrorCode: postmarkErr?.ErrorCode }));
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
