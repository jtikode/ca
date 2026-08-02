import nodemailer from "nodemailer";

// Platform-level SMTP config (like DATABASE_URL) — one mailbox sends on
// behalf of every tenant, not a per-org credential. Works with any SMTP
// provider, including a plain mailbox, so the user isn't locked into a paid
// email API.
let transporter: nodemailer.Transporter | undefined;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  await getTransporter().sendMail({ from: process.env.SMTP_FROM, ...opts });
}
