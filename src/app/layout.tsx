import { Cinzel, Source_Sans_3 } from "next/font/google";
import { Toaster } from "sonner";

import { AuthSessionProvider } from "@/providers/session-provider";
import { QueryProvider } from "@/providers/query-provider";

import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Ra — Portfolio de Mídia",
    template: "%s | Ra",
  },
  description:
    "Grave, envie e assista suas músicas e vídeos. Portfolio pessoal com conversão HLS, progresso em tempo real e biblioteca privada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${cinzel.variable} ${sourceSans.variable} antialiased`}>
        <AuthSessionProvider>
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: "border-gold/20",
                },
              }}
            />
          </QueryProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
