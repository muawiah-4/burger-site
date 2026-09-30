"use client";

import { RefObject, useEffect, useEffectEvent, useRef } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[inert]") && el.getClientRects().length > 0
  );
}

// Open dialogs, most recent last. Only the top one traps focus and reacts to
// Escape, so a dialog opened from another dialog behaves correctly.
const stack: symbol[] = [];

interface UseDialogOptions {
  /** Element to focus on open. Defaults to the dialog container itself (give it tabIndex={-1}). */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Modal dialog behaviour for an overlay: locks body scroll, moves focus into the
 * dialog on open, traps Tab/Shift+Tab inside it, closes on Escape and returns
 * focus to whatever had it before the dialog opened.
 *
 * Attach the returned ref to the element with role="dialog".
 */
export function useDialog<T extends HTMLElement = HTMLElement>(
  open: boolean,
  onClose: () => void,
  { initialFocusRef }: UseDialogOptions = {}
) {
  const ref = useRef<T>(null);
  useScrollLock(open);

  const requestClose = useEffectEvent(() => onClose());
  const getInitialFocus = useEffectEvent(() => initialFocusRef?.current ?? null);

  useEffect(() => {
    if (!open) return;
    const id = Symbol("dialog");
    stack.push(id);
    const isTop = () => stack[stack.length - 1] === id;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const container = ref.current;
    (getInitialFocus() ?? container)?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      const dialog = ref.current;
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = getFocusable(dialog);
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !active || !dialog.contains(active);
      if (e.shiftKey && (outside || active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (outside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };

    // Pull focus back if it escapes (e.g. a click on the page behind the backdrop).
    const onFocusIn = (e: FocusEvent) => {
      const dialog = ref.current;
      if (!isTop() || !dialog || !(e.target instanceof Node) || dialog.contains(e.target)) return;
      (getFocusable(dialog)[0] ?? dialog).focus({ preventScroll: true });
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      const wasTop = isTop();
      stack.splice(stack.indexOf(id), 1);
      // Only the dialog the user is actually in hands focus back; a dialog that
      // closes underneath another one must not steal focus from it.
      if (wasTop && returnTo?.isConnected) {
        returnTo.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return ref;
}
