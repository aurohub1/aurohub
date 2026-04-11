"use client";

import { useEffect } from "react";

/**
 * Protege o conteúdo das áreas logadas:
 * - user-select: none (exceto em inputs/textareas)
 * - bloqueia menu de contexto (clique direito)
 * - bloqueia atalhos: Ctrl+C, Ctrl+U, Ctrl+S, Ctrl+P, F12
 * - bloqueia drag de imagens
 *
 * Inputs/textareas/contenteditable continuam funcionando normalmente.
 */
export function useContentProtection(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    // Style global: desabilita seleção fora de inputs
    const style = document.createElement("style");
    style.setAttribute("data-ah-protect", "true");
    style.textContent = `
      body {
        -webkit-user-select: none;
        -moz-user-select: none;
        user-select: none;
      }
      input, textarea, [contenteditable="true"], [contenteditable=""] {
        -webkit-user-select: text;
        -moz-user-select: text;
        user-select: text;
      }
      img { -webkit-user-drag: none; user-drag: none; }
    `;
    document.head.appendChild(style);

    function isEditable(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    function onKeyDown(e: KeyboardEvent) {
      // F12 → DevTools
      if (e.key === "F12") { e.preventDefault(); return; }
      // Ctrl+Shift+I/J/C → DevTools
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
        e.preventDefault();
        return;
      }
      // Ctrl+U view source, Ctrl+S save, Ctrl+P print
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const k = e.key.toUpperCase();
        if (k === "U" || k === "S" || k === "P") { e.preventDefault(); return; }
        // Ctrl+C fora de inputs
        if (k === "C" && !isEditable(e.target)) {
          // Só bloqueia se não há seleção dentro de form field
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed || !isEditable(sel.anchorNode?.parentElement ?? null)) {
            e.preventDefault();
            return;
          }
        }
      }
    }

    function onDragStart(e: DragEvent) {
      const el = e.target as HTMLElement | null;
      if (el && el.tagName === "IMG") e.preventDefault();
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("dragstart", onDragStart);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("dragstart", onDragStart);
      style.remove();
    };
  }, [enabled]);
}
