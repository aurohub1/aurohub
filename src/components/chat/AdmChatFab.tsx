"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

interface Props {
  onClick: () => void;
  isOpen: boolean;
  unreadCount: number;
}

export default function AdmChatFab({ onClick, isOpen, unreadCount }: Props) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (isOpen) return null;
  if (pathname && /\/chat(\/|$)/.test(pathname)) return null;

  return (
    <>
      <style>{`
        .ah-adm-chat-fab {
          opacity: 0;
          transform: scale(0.6);
          pointer-events: none;
          transition: opacity 300ms ease, transform 250ms ease, box-shadow 200ms ease;
          box-shadow: 0 6px 20px rgba(16,185,129,0.35);
        }
        .ah-adm-chat-fab[data-ready="true"] {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }
        .ah-adm-chat-fab[data-ready="true"]:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 28px rgba(16,185,129,0.55);
        }
      `}</style>
      <button
        type="button"
        onClick={onClick}
        aria-label="Abrir chat interno"
        data-ready={ready ? "true" : "false"}
        className="ah-adm-chat-fab fixed bottom-4 right-[72px] z-[9988] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-emerald-500 text-white"
      >
        <MessageCircle size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
