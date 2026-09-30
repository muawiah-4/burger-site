"use client";

import { useState } from "react";

/**
 * True from the first time `open` is true onwards. Lazily loaded overlays mount on
 * their first open and then stay mounted, so AnimatePresence can play the exit
 * animation and useDialog can return focus on close.
 */
export function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
}
