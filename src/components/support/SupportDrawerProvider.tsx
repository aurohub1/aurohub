"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import SupportChat from "./SupportChat";

interface SupportDrawerCtx {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const Ctx = createContext<SupportDrawerCtx | null>(null);

export function useSupportDrawer(): SupportDrawerCtx {
  const c = useContext(Ctx);
  // No-op quando usado fora do provider (ex: layout do ADM que não tem drawer)
  return c ?? { open: () => {}, close: () => {}, isOpen: false };
}

export function SupportDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <Ctx.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && <SupportChat onClose={close} />}
    </Ctx.Provider>
  );
}
