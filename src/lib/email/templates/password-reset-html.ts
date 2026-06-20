import { escapeHtml } from "@/lib/email/templates/escape-html";

const COLORS = {
  lapis: "#1e3264",
  lapisDeep: "#152548",
  gold: "#c9a227",
  goldLight: "#e8c96a",
  papyrus: "#f7f0e3",
  papyrusCard: "#fffdf8",
  sand: "#e8dcc8",
  text: "#243b6b",
  muted: "#5c6478",
  white: "#ffffff",
} as const;

type PasswordResetHtmlInput = {
  greeting: string;
  resetUrl: string;
};

export function buildPasswordResetHtml(input: PasswordResetHtmlInput) {
  const greeting = escapeHtml(input.greeting);
  const resetUrl = escapeHtml(input.resetUrl);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Redefinir senha — Ra</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.papyrus};font-family:Georgia,'Times New Roman',serif;color:${COLORS.text};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    Redefina sua senha no Ra — link válido por 1 hora.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.papyrus};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${COLORS.lapisDeep} 0%, ${COLORS.lapis} 100%);border-radius:12px 12px 0 0;padding:28px 32px;border:1px solid rgba(201,162,39,0.25);border-bottom:none;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="52" valign="middle">
                    <div style="width:48px;height:48px;border-radius:50%;background:radial-gradient(circle at 35% 35%, ${COLORS.goldLight} 0%, ${COLORS.gold} 55%, #9a7b1a 100%);border:2px solid rgba(255,255,255,0.35);text-align:center;line-height:44px;font-family:Georgia,serif;font-size:18px;font-weight:bold;color:${COLORS.lapisDeep};">
                      ☀
                    </div>
                  </td>
                  <td valign="middle" style="padding-left:14px;">
                    <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:bold;letter-spacing:0.12em;color:${COLORS.goldLight};text-transform:uppercase;">
                      Ra
                    </p>
                    <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;color:rgba(255,255,255,0.72);text-transform:uppercase;">
                      Portfolio de Mídia
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background-color:${COLORS.papyrusCard};padding:36px 32px 28px;border-left:1px solid ${COLORS.sand};border-right:1px solid ${COLORS.sand};">
              <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;line-height:1.3;color:${COLORS.text};">
                ${greeting},
              </p>
              <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${COLORS.muted};">
                Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="border-radius:8px;background:linear-gradient(180deg, ${COLORS.lapis} 0%, ${COLORS.lapisDeep} 100%);box-shadow:0 4px 14px rgba(30,50,100,0.28);">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;letter-spacing:0.04em;color:${COLORS.papyrus};text-decoration:none;border-radius:8px;border:1px solid rgba(201,162,39,0.45);">
                      Redefinir senha
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;background-color:${COLORS.papyrus};border:1px solid ${COLORS.sand};border-radius:8px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.gold};">
                      Validade
                    </p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${COLORS.muted};">
                      Este link expira em <strong style="color:${COLORS.text};">1 hora</strong> e só pode ser usado uma vez.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${COLORS.muted};">
                Se o botão não funcionar, copie e cole este endereço no navegador:
              </p>
              <p style="margin:0;padding:12px 14px;background-color:${COLORS.papyrus};border:1px dashed ${COLORS.sand};border-radius:6px;font-family:'Courier New',Courier,monospace;font-size:11px;line-height:1.5;word-break:break-all;color:${COLORS.text};">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Security notice -->
          <tr>
            <td style="background-color:${COLORS.papyrusCard};padding:0 32px 28px;border-left:1px solid ${COLORS.sand};border-right:1px solid ${COLORS.sand};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${COLORS.sand};">
                <tr>
                  <td style="padding-top:20px;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${COLORS.muted};">
                      Se você <strong style="color:${COLORS.text};">não solicitou</strong> esta alteração, ignore este email. Sua senha permanece a mesma.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${COLORS.lapisDeep};border-radius:0 0 12px 12px;padding:20px 32px;border:1px solid rgba(201,162,39,0.2);border-top:none;text-align:center;">
              <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:13px;letter-spacing:0.1em;color:${COLORS.goldLight};">
                Ra · Portfolio de Mídia
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.5);">
                Mensagem automática — não responda este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
