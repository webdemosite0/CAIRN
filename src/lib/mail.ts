import "server-only";
import { site } from "@/lib/site";

/**
 * Outbound email, over Resend's HTTP API.
 *
 * HTTP rather than SMTP because the app runs on serverless functions, where a
 * long-lived socket to a mail server is exactly the thing that does not work.
 *
 * Configuration is two variables in .env.local:
 *
 *   RESEND_API_KEY=re_...
 *   MAIL_FROM="Trove <hello@yourdomain.com>"
 *
 * The from-address has to be on a domain verified with Resend; their sandbox
 * sender only delivers to the account owner, which looks like "verification is
 * broken" to everybody else.
 */

export function mailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

export interface MailResult {
  sent: boolean;
  /** Why not, when sent is false. Never shown to the person signing up. */
  reason?: string;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  if (!mailerConfigured()) {
    // Development, and any deploy where mail was never set up. The link is
    // logged so the flow is still walkable; see verificationEnforced().
    console.warn(
      `mail: not configured, so nothing was sent to ${opts.to}.\n` +
        `      Subject: ${opts.subject}\n` +
        `      ${opts.text}`,
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM!.trim(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("mail: send failed —", res.status, detail.slice(0, 300));
      return { sent: false, reason: `http-${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("mail: send threw —", e instanceof Error ? e.message : String(e));
    return { sent: false, reason: "network" };
  }
}

/**
 * Whether an unverified account is actually blocked.
 *
 * Tied to the mailer being configured, deliberately. Enforcing verification
 * with no way to send the email would brick the app for everyone including its
 * owner, so without a mailer new accounts are marked verified on creation and
 * a warning is logged. Set RESEND_API_KEY and MAIL_FROM to turn it on.
 */
export function verificationEnforced(): boolean {
  return mailerConfigured();
}

/** The verification email. Plain, because mail clients ruin everything else. */
export function verificationEmail(name: string, link: string) {
  const subject = `Confirm your email for ${site.name}`;
  const text =
    `Hi ${name},\n\n` +
    `Confirm this address to finish setting up your ${site.name} account:\n\n` +
    `${link}\n\n` +
    `The link works once and expires in 24 hours.\n` +
    `If you did not create an account, ignore this — nothing happens until the link is opened.\n`;

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Confirm this address to finish setting up your ${escapeHtml(site.name)} account.</p>
      <p style="margin:28px 0">
        <a href="${escapeAttr(link)}"
           style="background:#6c5ce7;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600">
          Confirm email
        </a>
      </p>
      <p style="color:#555;font-size:13px">
        The link works once and expires in 24 hours. If you did not create an
        account, ignore this — nothing happens until the link is opened.
      </p>
      <p style="color:#888;font-size:12px;word-break:break-all">${escapeHtml(link)}</p>
    </div>`;

  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}
