// Email service — SMTP when configured, mock/log otherwise.
// To enable real sending set these env vars:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (or SMTP_PASSWORD), SMTP_FROM
// Any S3-compatible or Resend/SendGrid API can replace the SMTP transport
// by swapping the sendViaSMTP() implementation below.

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    smtpPassword() &&
    process.env.SMTP_FROM
  );
}

function smtpPassword() {
  return process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
}

async function sendViaSMTP(payload: EmailPayload): Promise<void> {
  // nodemailer is listed as an optionalDependency and marked as a
  // serverExternalPackage in next.config.ts so it is never bundled.
  // It is only loaded at runtime when SMTP_HOST is configured.
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPassword()
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    ...(payload.html ? { html: payload.html } : {})
  });
}

function logEmail(payload: EmailPayload): void {
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[email:mock] To: ${payload.to} | Subject: ${payload.subject}`
    );
  } else if (process.env.NODE_ENV !== "test") {
    console.error("[email] SMTP is not configured; email delivery was skipped.");
  }
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character] ?? character);
}

/**
 * Send an email. Falls back to console logging when SMTP is not configured.
 * Never throws — email failure should not interrupt a user-facing action.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    if (smtpConfigured()) {
      await sendViaSMTP(payload);
    } else {
      logEmail(payload);
    }
  } catch (err) {
    console.error("[email] Failed to send:", (err as Error).message);
  }
}
