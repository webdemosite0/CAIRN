import "server-only";
import { site } from "@/lib/site";

/**
 * Outbound email, over whichever transport is configured.
 *
 * Two are supported, and they suit different situations:
 *
 *   Resend — an HTTP API. Nothing to keep open, which is the right shape for
 *   serverless: a function that runs for two seconds cannot usefully hold a
 *   socket to a mail server.
 *
 *     RESEND_API_KEY=re_...
 *     MAIL_FROM="Trove <official@troveai.site>"
 *
 *   SMTP — an ordinary mailbox, the kind that comes with a domain. Slower,
 *   because it opens a TLS connection and speaks a conversation before it can
 *   send anything, but it means the mailbox already paid for is the one that
 *   sends, rather than signing up to a second service to send from the same
 *   address.
 *
 *     SMTP_HOST=mail.spacemail.com
 *     SMTP_PORT=465
 *     SMTP_USER=official@troveai.site
 *     SMTP_PASSWORD=...
 *     MAIL_FROM="Trove <official@troveai.site>"
 *
 * Resend wins when both are set — it is the faster path and the one that does
 * not hold a connection open.
 *
 * Whichever is used, the from-address must belong to a domain that transport
 * is allowed to send for. Resend's sandbox sender only delivers to the account
 * owner, and an SMTP server will refuse a From it does not own; both look like
 * "verification is broken" to everyone except the person testing it.
 */

type Transport = "resend" | "smtp" | "none";

function transport(): Transport {
  const from = process.env.MAIL_FROM?.trim();
  // MAIL_FROM is required either way: a message with no From is not a message.
  if (!from) return "none";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASSWORD?.trim()
  ) {
    return "smtp";
  }
  return "none";
}

export function mailerConfigured(): boolean {
  return transport() !== "none";
}

/** Which one is live, for the setup screen and /api/health. */
export function mailTransport(): Transport {
  return transport();
}

export interface MailResult {
  sent: boolean;
  /** Why not, when sent is false. Never shown to the person signing up. */
  reason?: string;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(opts: MailOptions): Promise<MailResult> {
  const via = transport();

  if (via === "none") {
    // Development, and any deploy where mail was never set up. The link is
    // logged so the flow is still walkable; see verificationEnforced().
    console.warn(
      `mail: not configured, so nothing was sent to ${opts.to}.\n` +
        `      Subject: ${opts.subject}\n` +
        `      ${opts.text}`,
    );
    return { sent: false, reason: "not-configured" };
  }

  return via === "resend" ? sendViaResend(opts) : sendViaSmtp(opts);
}

async function sendViaResend(opts: MailOptions): Promise<MailResult> {
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
      console.error("mail: resend failed —", res.status, detail.slice(0, 300));
      return { sent: false, reason: `http-${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("mail: resend threw —", e instanceof Error ? e.message : String(e));
    return { sent: false, reason: "network" };
  }
}

async function sendViaSmtp(opts: MailOptions): Promise<MailResult> {
  try {
    // Imported here, not at module scope: nodemailer is a Node-only package
    // and this module is reached from code that is otherwise happy to be
    // bundled anywhere.
    const nodemailer = (await import("nodemailer")).default;

    const port = Number(process.env.SMTP_PORT?.trim() || 465);

    const mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      // 465 is implicit TLS; 587 starts plain and upgrades with STARTTLS.
      // Getting this backwards is the usual cause of a hang rather than an
      // error, because the client waits for a greeting that never comes.
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        pass: process.env.SMTP_PASSWORD!.trim(),
      },
      // A serverless function has a hard ceiling on how long it may run. Fail
      // in ten seconds with a reason rather than being killed at 60 with none.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    await mailer.sendMail({
      from: process.env.MAIL_FROM!.trim(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    return { sent: true };
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    console.error("mail: smtp failed —", why);
    return { sent: false, reason: "smtp" };
  }
}

/**
 * Whether an unverified account is actually blocked.
 *
 * Tied to the mailer being configured, deliberately. Enforcing verification
 * with no way to send the email would brick the app for everyone including its
 * owner, so without a mailer new accounts are marked verified on creation and
 * a warning is logged instead.
 */
export function verificationEnforced(): boolean {
  return mailerConfigured();
}

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
           style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600">
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
