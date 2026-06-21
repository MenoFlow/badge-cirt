import nodemailer from "nodemailer";
import { httpError } from "../lib/api.js";

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw httpError(500, `Configuration email manquante: ${name}`);
  return value;
}

function createTransporter() {
  const host = requiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = requiredEnv("SMTP_USER");
  const pass = requiredEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS ?? 20_000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS ?? 15_000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS ?? 30_000),
  });
}

export function describeMailError(error: unknown) {
  const err = error as { code?: string; command?: string; response?: string; message?: string };
  if (err.code === "EAUTH") return "Authentification SMTP refusée. Vérifiez SMTP_USER et SMTP_PASS.";
  if (err.code === "ECONNECTION" || err.code === "ETIMEDOUT" || err.code === "ESOCKET") return "Connexion SMTP interrompue ou trop lente.";
  if (err.code === "EENVELOPE") return "Adresse email destinataire invalide.";
  if (err.response) return err.response;
  return err.message ?? "Erreur SMTP inconnue.";
}

export async function sendMailWithAttachments(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments: MailAttachment[];
}) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
  if (!from) throw httpError(500, "Configuration email manquante: SMTP_FROM");
  const replyTo = process.env.SMTP_REPLY_TO?.trim() || process.env.SMTP_USER?.trim();

  const info = await transporter.sendMail({
    from,
    replyTo,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments,
    priority: "normal",
    headers: {
      "X-Auto-Response-Suppress": "All",
    },
  });
  return { messageId: info.messageId };
}
