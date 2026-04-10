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
          --ed-bind: #b8962d;
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
          --ed-bind: #D4A843;
          --ed-orange: #FF7A1A;
          --ed-navy: #1E3A6E;
          --ed-danger: #f85149;
          --ed-green: #3fb950;
        }
        .react-colorful { width: 100% !important; height: 120px !important; border-radius: 6px !important; }
        .react-colorful__saturation { border-radius: 6px 6px 0 0 !important; }
        .react-colorful__hue { height: 10px !important; border-radius: 0 0 6px 6px !important; }
        .react-colorful__pointer { width: 14px !important; height: 14px !important; }
      `}</style>
      {children}
    </>
  );
}
