import { useEffect } from "react";

export function useAntiCopy() {
  useEffect(() => {
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const blocked = ctrl && ["u","s","p","a","c"].includes(e.key.toLowerCase());
      const devTools =
        e.key === "F12" ||
        (ctrl && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase()));
      if (blocked || devTools) e.preventDefault();
    };
    const blockSelect = () => { document.body.style.userSelect = "none"; };

    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("keydown", blockKeys);
    blockSelect();

    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys);
      document.body.style.userSelect = "";
    };
  }, []);
}
