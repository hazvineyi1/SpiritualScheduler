// Sends a plain notification email via Resend's HTTP API. Deliberately
// dependency-free (a single fetch call) since this is the only email need
// in the app so far.
//
// Requires RESEND_API_KEY to be set. Until a sending domain is verified in
// Resend, FROM_EMAIL should stay on Resend's shared "onboarding@resend.dev"
// address — Resend will still deliver to any real inbox, it just shows
// that address as the sender until a custom domain is verified.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || "onboarding@resend.dev";

export async function sendNotificationEmail(to: string, subject: string, text: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[email skipped, no RESEND_API_KEY set] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email failed] ${res.status}: ${body}`);
    }
  } catch (err) {
    // Never let a failed notification email break the actual request that
    // triggered it (a feedback submission should still succeed either way).
    console.error("[email error]", err);
  }
}
