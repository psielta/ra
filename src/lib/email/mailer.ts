import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { PORTS } from "@/config/ports";
import { createRequestLogger } from "@/lib/logger";

const mailLogger = createRequestLogger({ module: "email" });

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function getSmtpConfig(): SMTPTransport.Options {
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? PORTS.mailhogSmtp);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  return {
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  };
}

function getFromAddress() {
  return process.env.EMAIL_FROM ?? "Ra <noreply@ra.local>";
}

const globalForMailer = globalThis as unknown as {
  mailTransporter: nodemailer.Transporter | undefined;
};

function getTransporter() {
  if (!globalForMailer.mailTransporter) {
    globalForMailer.mailTransporter =
      nodemailer.createTransport(getSmtpConfig());
  }

  return globalForMailer.mailTransporter;
}

export async function sendEmail(input: SendEmailInput) {
  const transporter = getTransporter();

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      // Base64 evita quoted-printable quebrar URLs longas (tokens de reset).
      textEncoding: "base64",
    });

    mailLogger.info({
      event: "email.sent",
      to: input.to,
      subject: input.subject,
      messageId: info.messageId,
    });

    return info;
  } catch (error) {
    mailLogger.error({
      event: "email.send_failed",
      to: input.to,
      subject: input.subject,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
