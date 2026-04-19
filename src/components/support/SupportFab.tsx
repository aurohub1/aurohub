"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useSupportDrawer } from "./SupportDrawerProvider";

export default function SupportFab() {
  const drawer = useSupportDrawer();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!drawer) return null;
  if (drawer.isOpen) return null;
  if (pathname && /\/suporte(\/|$)/.test(pathname)) return null;

  return (
    <>
      <style>{`
        .ah-support-fab {
          opacity: 0;
          transform: scale(0.6);
          pointer-events: none;
          transition: opacity 300ms ease, transform 250ms ease, box-shadow 200ms ease;
          box-shadow: 0 6px 20px rgba(59,130,246,0.35);
        }
        .ah-support-fab[data-ready="true"] {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }
        .ah-support-fab[data-ready="true"]:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 28px rgba(59,130,246,0.55), 0 0 0 8px rgba(59,130,246,0.15);
        }
      `}</style>
      <button
        type="button"
        onClick={drawer.open}
        aria-label="Abrir suporte"
        data-ready={ready ? "true" : "false"}
        className="ah-support-fab fixed bottom-6 right-6 z-[9997] flex h-[52px] w-[52px] items-center justify-center rounded-full text-white"
        style={{ background: "var(--blue, #3B82F6)" }}
      >
        <MessageCircle size={22} />
      </button>
    </>
  );
}
