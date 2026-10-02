"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { AccountUser, SavedAddress } from "@/lib/api-types";
import { fetchMe } from "@/lib/account-client";

export type AccountTab = "orders" | "profile" | "rewards" | "security";

export type AuthStatus = "loading" | "signed-out" | "signed-in";

interface AccountModalContextValue {
  isOpen: boolean;
  openAccount: () => void;
  closeAccount: () => void;
  initialTab?: AccountTab;
  openWithTab: (tab: AccountTab) => void;
  /** The signed-in account (null when signed out or still loading). */
  user: AccountUser | null;
  address: SavedAddress | null;
  authStatus: AuthStatus;
  /** Updates the in-memory session state after a sign-in, profile save or sign-out. */
  setAccount: (user: AccountUser | null, address?: SavedAddress | null) => void;
  setAddress: (address: SavedAddress | null) => void;
}

const AccountModalContext = createContext<AccountModalContextValue | undefined>(undefined);

export function AccountModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<AccountTab>("orders");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [address, setAddress] = useState<SavedAddress | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    // The session cookie is HttpOnly, so ask the server who (if anyone) is signed in.
    const controller = new AbortController();
    fetchMe(controller.signal)
      .then((me) => {
        setUser(me.user);
        setAddress(me.address);
        setAuthStatus(me.user ? "signed-in" : "signed-out");
      })
      .catch(() => {
        if (!controller.signal.aborted) setAuthStatus("signed-out");
      });
    return () => controller.abort();
  }, []);

  const setAccount = useCallback((next: AccountUser | null, nextAddress?: SavedAddress | null) => {
    setUser(next);
    if (nextAddress !== undefined || next === null) setAddress(nextAddress ?? null);
    setAuthStatus(next ? "signed-in" : "signed-out");
  }, []);

  const openAccount = useCallback(() => {
    setInitialTab("orders");
    setIsOpen(true);
  }, []);

  const closeAccount = useCallback(() => setIsOpen(false), []);

  const openWithTab = useCallback((tab: AccountTab) => {
    setInitialTab(tab);
    setIsOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      openAccount,
      closeAccount,
      initialTab,
      openWithTab,
      user,
      address,
      authStatus,
      setAccount,
      setAddress,
    }),
    [isOpen, openAccount, closeAccount, initialTab, openWithTab, user, address, authStatus, setAccount]
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
