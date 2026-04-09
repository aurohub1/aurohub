"use client";

import { useEffect } from "react";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  return <div className="flex h-dvh flex-col bg-[#1a1a2e] overflow-hidden">{children}</div>;
}
