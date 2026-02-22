import { NextRequest, NextResponse } from "next/server";
import * as postmark from "postmark";

const CONTACT_REASONS: Record<string, string> = {
  general: "General enquiry",
  business: "Business listing / claim",
  partnership: "Partnership or press",
  bug: "Bug or technical issue",
  feedback: "Feedback or suggestion",
  other: "Something else",
};

export async function POST(req: NextRequest) {
  const { name, email, reason, message } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const apiKey = process.env.NEXT_POSTMARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service not configured." }, { status: 500 });
  }

  const client = new postmark.ServerClient(apiKey);
  const reasonLabel = CONTACT_REASONS[reason] ?? reason;

  try {
    await client.sendEmail({
      From: "info@sayso.com",
      To: "info@sayso.com",
      ReplyTo: email,
      Subject: `[${reasonLabel}] – ${name}`,
      TextBody: `Name: ${name}\nEmail: ${email}\nReason: ${reasonLabel}\n\n${message}`,
      HtmlBody: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Reason:</strong> ${reasonLabel}</p>
        <hr />
        <p style="white-space:pre-wrap">${message}</p>
      `,
      MessageStream: "outbound",
    });

    // Auto-reply to the sender
    await client.sendEmail({
      From: "info@sayso.com",
      To: email,
      Subject: "We received your message – Sayso",
      TextBody: `Hi ${name},\n\nThanks for reaching out! We received your message and will get back to you within 24–48 hours.\n\nThe Sayso Team`,
      HtmlBody: `
        <p>Hi ${name},</p>
        <p>Thanks for reaching out! We received your message and will get back to you within 24–48 hours.</p>
        <p>The Sayso Team</p>
      `,
      MessageStream: "outbound",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Postmark error:", err);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
