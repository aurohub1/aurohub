import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import SwRegister from "./sw-register";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aurohub",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A6E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        {/* Helvetica Neue Heavy + Bold — preload global para canvas de publicação */}
        <link rel="preload" href="https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEHEAVY_q77zuw.OTF" as="font" type="font/otf" crossOrigin="anonymous" />
        <link rel="preload" href="https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEBOLD_mzadvj.OTF" as="font" type="font/otf" crossOrigin="anonymous" />
        {/* iOS splash screens — apple-touch-startup-image */}
        <link rel="apple-touch-startup-image" href="/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1668x2224.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-828x1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex bg-[var(--bg)] text-[var(--txt)] font-[family-name:var(--font-dm-sans)]"
      >
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
