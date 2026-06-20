import { APP_URL } from "@/config/ports";
import { sendEmail } from "@/lib/email/mailer";
import { buildPasswordResetHtml } from "@/lib/email/templates/password-reset-html";

export async function sendPasswordResetEmail(input: {
  to: string;
  name?: string | null;
  token: string;
}) {
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(input.token)}`;
  const greeting = input.name ? `Olá, ${input.name}` : "Olá";

  const text = `${greeting},

Recebemos um pedido para redefinir a senha da sua conta no Ra.

Acesse o link abaixo para criar uma nova senha (válido por 1 hora):
${resetUrl}

Se você não solicitou esta alteração, ignore este email.

— Ra · Portfolio de Mídia`;

  const html = buildPasswordResetHtml({ greeting, resetUrl });

  await sendEmail({
    to: input.to,
    subject: "Redefinir senha — Ra",
    text,
    html,
  });
}
