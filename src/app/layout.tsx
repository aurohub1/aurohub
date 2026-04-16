import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Aurohub — Central ADM",
  description: "SaaS de imagens para agências de viagem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmSerif.variable} ${cormorant.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('ah_theme');if(!t){var h=new Date().getHours();t=(h>=6&&h<19)?'light':'dark';}document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex bg-[var(--bg)] text-[var(--txt)] font-[family-name:var(--font-dm-sans)]"
      >
        {children}
      </body>
    </html>
  );
}
