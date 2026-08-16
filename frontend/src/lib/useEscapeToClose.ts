import { useEffect } from "react";

/**
 * Closes a modal/overlay on Escape. Most of this app's overlays only close
 * via a backdrop click, which a keyboard-only or screen-reader user can't
 * reach — Escape is the standard, expected way out of any dialog.
 */
export function useEscapeToClose(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, active]);
}
