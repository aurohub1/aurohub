"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import SupportChat from "./SupportChat";

interface SupportDrawerCtx {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const Ctx = createContext<SupportDrawerCtx | null>(null);

/**
 * Retorna o contexto do drawer. Fora do provider (ex: layout ADM) retorna null —
 * caller usa isso pra decidir entre abrir drawer vs navegar por href.
 */
export function useSupportDrawer(): SupportDrawerCtx | null {
  return useContext(Ctx);
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
