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
  const [minimized, setMinimized] = useState(false);
  const open     = useCallback(() => { setIsOpen(true);  setMinimized(false); }, []);
  const close    = useCallback(() => { setIsOpen(false); setMinimized(false); }, []);
  const minimize = useCallback(() => setMinimized(true),  []);
  const restore  = useCallback(() => setMinimized(false), []);

  return (
    <Ctx.Provider value={{ open, close, isOpen }}>
      {children}
      {/* Sempre montado — visibilidade controlada via display dentro do componente */}
      <SupportChat
        onClose={close}
        isOpen={isOpen}
        minimized={minimized}
        onMinimize={minimize}
        onRestore={restore}
      />
    </Ctx.Provider>
  );
}
