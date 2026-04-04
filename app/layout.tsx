import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurohub — Plataforma de Conteúdo para Instagram",
  description:
    "Crie, personalize e publique artes profissionais para Instagram de forma rápida e escalável.",
  icons: { icon: "/img/icon-192.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
