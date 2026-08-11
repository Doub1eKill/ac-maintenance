import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound email, configured entirely through environment variables so the
 * same code works against a Gmail App Password, the university's own SMTP
 * relay, or a transactional provider — none of them are special-cased here.
 *
 * Required to actually send:
 *   SMTP_HOST      e.g. smtp.gmail.com
 *   SMTP_PORT      587 (STARTTLS) or 465 (implicit TLS)
 *   SMTP_USER      account used to authenticate
 *   SMTP_PASSWORD  app password / API key — never a personal login password
 * Optional:
 *   SMTP_FROM      From: header, defaults to SMTP_USER
 *   SMTP_SECURE    "true" to force implicit TLS; otherwise inferred from port
 *
 * With none of these set the app keeps working: sendMail() reports that no
 * transport is configured and the caller falls back to its development
 * behaviour instead of throwing. That keeps local development running
 * without credentials, but it also means a misconfigured production deploy
 * fails quietly, so isMailConfigured() exists for callers that need to say
 * so out loud.
 */

let cachedTransporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
  );
}

function getTransporter(): Transporter | null {
  if (!isMailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  const port = Number(process.env.SMTP_PORT);
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Port 465 speaks TLS from the first byte; 587 starts in the clear and
    // upgrades via STARTTLS. Getting this backwards is the usual cause of a
    // connection that hangs instead of failing, so it is derived from the
    // port unless SMTP_SECURE says otherwise.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return cachedTransporter;
}

export type SendMailResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

export async function sendMail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendMailResult> {
  const transporter = getTransporter();
  if (!transporter) return { status: "not_configured" };

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { status: "sent" };
  } catch (error) {
    // Swallowed rather than rethrown: every caller so far is a user-facing
    // flow that must not reveal whether a given address exists, so a send
    // failure has to look identical to a success from the outside. The
    // detail goes to the server log for whoever is debugging delivery.
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mail] send failed:", message);
    return { status: "failed", error: message };
  }
}

/**
 * Base URL used to build links inside emails. Falls back to localhost so
 * development works untouched, but a link pointing at localhost is useless
 * in a real inbox — set APP_URL (or NEXTAUTH_URL) before sending mail to
 * anyone other than yourself.
 */
export function getAppUrl(): string {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}
