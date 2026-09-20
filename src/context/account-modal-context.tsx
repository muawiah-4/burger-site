"use client";

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

interface AccountModalContextValue {
  isOpen: boolean;
  openAccount: () => void;
  closeAccount: () => void;
  initialTab?: "orders" | "profile" | "rewards";
  openWithTab: (tab: "orders" | "profile" | "rewards") => void;
}

const AccountModalContext = createContext<AccountModalContextValue | undefined>(undefined);

export function AccountModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"orders" | "profile" | "rewards">("orders");

  const openAccount = useCallback(() => {
    setInitialTab("orders");
    setIsOpen(true);
  }, []);

  const closeAccount = useCallback(() => setIsOpen(false), []);

  const openWithTab = useCallback((tab: "orders" | "profile" | "rewards") => {
    setInitialTab(tab);
    setIsOpen(true);
  }, []);

  const value = useMemo(
    () => ({ isOpen, openAccount, closeAccount, initialTab, openWithTab }),
    [isOpen, openAccount, closeAccount, initialTab, openWithTab]
  );

  return <AccountModalContext.Provider value={value}>{children}</AccountModalContext.Provider>;
}

export function useAccountModal() {
  const ctx = useContext(AccountModalContext);
  if (!ctx) {
    throw new Error("useAccountModal must be used within an AccountModalProvider");
  }
  return ctx;
}
