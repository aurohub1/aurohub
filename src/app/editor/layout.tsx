"use client";

import { useEffect } from "react";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    document.documentElement.setAttribute("data-theme", saved || "light");
  }, []);

  return (
    <>
      <style>{`
        :root, [data-theme="light"] {
          --ed-bg: #f5f7fa;
          --ed-surface: #ffffff;
          --ed-surface2: #f0f4f8;
          --ed-canvas-bg: #e8ecf0;
          --ed-txt: #1a1a2e;
          --ed-txt2: #57606a;
          --ed-txt3: #8b949e;
          --ed-bdr: #d0d7de;
          --ed-input: #f6f8fa;
          --ed-input-bdr: #d0d7de;
          --ed-hover: #f0f4f8;
          --ed-active: rgba(59,130,246,0.1);
          --ed-active-txt: #3B82F6;
          --ed-accent: #3B82F6;
          --ed-bind: #1E3A6E;
          --ed-orange: #FF7A1A;
          --ed-navy: #1E3A6E;
          --ed-danger: #cf222e;
          --ed-green: #1a7f37;
        }
        [data-theme="dark"] {
          --ed-bg: #0d1117;
          --ed-surface: #161b22;
          --ed-surface2: #1c2128;
          --ed-canvas-bg: #0d1117;
          --ed-txt: #e6edf3;
          --ed-txt2: #8b949e;
          --ed-txt3: #484f58;
          --ed-bdr: #30363d;
          --ed-input: #161b22;
          --ed-input-bdr: #30363d;
          --ed-hover: #1c2128;
          --ed-active: rgba(59,130,246,0.15);
          --ed-active-txt: #3B82F6;
          --ed-accent: #3B82F6;
          --ed-bind: #FFFFFF;
          --ed-orange: #FF7A1A;
          --ed-navy: #1E3A6E;
          --ed-danger: #f85149;
          --ed-green: #3fb950;
        }
        /* Helvetica Neue — fallback stack para pesos 100-900.
           Se o SO tiver Helvetica Neue instalada (macOS/iOS), usa direto;
           senão cai em Helvetica/Arial. Konva consome via ctx.font. */
        @font-face { font-family: "Helvetica Neue"; font-weight: 100; src: local("Helvetica Neue Thin"), local("HelveticaNeue-Thin"), local("Helvetica Neue UltraLight"), local("Helvetica"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 300; src: local("Helvetica Neue Light"), local("HelveticaNeue-Light"), local("Helvetica"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 400; src: local("Helvetica Neue"), local("HelveticaNeue"), local("Helvetica"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 500; src: local("Helvetica Neue Medium"), local("HelveticaNeue-Medium"), local("Helvetica"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 700; src: local("Helvetica Neue Bold"), local("HelveticaNeue-Bold"), local("Helvetica Bold"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 800; src: local("Helvetica Neue Heavy"), local("HelveticaNeue-Heavy"), local("Helvetica"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 900; src: local("Helvetica Neue Black"), local("HelveticaNeue-CondensedBlack"), local("Helvetica"); font-display: swap; }
        .react-colorful { width: 100% !important; height: 120px !important; border-radius: 6px !important; }
        .react-colorful__saturation { border-radius: 6px 6px 0 0 !important; }
        .react-colorful__hue { height: 10px !important; border-radius: 0 0 6px 6px !important; }
        .react-colorful__pointer { width: 14px !important; height: 14px !important; }
      `}</style>
      {children}
    </>
  );
}
