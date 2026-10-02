"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { Check, KeyRound, LogOut, Trash2 } from "lucide-react";
import type { AccountUser, SavedAddress } from "@/lib/api-types";
import { ApiError } from "@/lib/order-client";
import {
  changePassword,
  claimDeviceOrders,
  deleteAccount,
  forgetAddress,
  logIn,
  logOut,
  saveAddress,
  signUp,
  updateProfile,
} from "@/lib/account-client";
import { Button } from "@/components/ui/Button";

export const inputClass =
  "focus-ring mt-1 w-full rounded-xl border border-cream/15 bg-charcoal-soft/50 px-3.5 py-2 text-xs text-cream placeholder:text-cream/40";
const labelClass = "text-[11px] font-bold text-cream";
const cardClass = "rounded-2xl border border-cream/10 bg-charcoal-raised p-4";
const headingClass = "font-display text-xs font-bold uppercase tracking-wider text-cream/60";

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "validation_failed") {
      const first = (err.body?.error.details as { message: string }[] | undefined)?.[0];
      return first?.message ?? err.message;
    }
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} aria-describedby={hintId} className={inputClass} {...props} />
      {hint && (
        <p id={hintId} className="mt-1 text-[11px] text-cream/60">
          {hint}
        </p>
      )}
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  return (
    <p role="alert" className="text-xs font-semibold text-ember-text empty:hidden">
      {message}
    </p>
  );
}

// ---------------------------------------------------------------- sign in / create account

export function AuthPanel({
  onSignedIn,
}: {
  onSignedIn: (user: AccountUser, address: SavedAddress | null) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = mode === "signin" ? await logIn({ email, password }) : await signUp({ email, password, name });
      // Link any guest orders this browser placed before signing in.
      await claimDeviceOrders();
      setPassword("");
      onSignedIn(res.user, res.address);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const signup = mode === "signup";
  return (
    <div className="flex flex-col gap-4">
      <div className={cardClass}>
        <h3 className="font-display text-base font-extrabold text-cream">
          {signup ? "Create your Ember account" : "Sign in to Ember"}
        </h3>
        <p className="mt-1 text-xs text-cream/60">
          {signup
            ? "Keep your orders, details and rewards across devices. Guest checkout still works without one."
            : "See your orders on any device and check out faster."}
        </p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3" aria-label={signup ? "Create account" : "Sign in"}>
          {signup && (
            <Field label="Name (optional)" type="text" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={signup ? 10 : undefined}
            maxLength={200}
            hint={signup ? "At least 10 characters. Avoid common passwords." : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormError message={error} />
          <Button type="submit" size="sm" variant="primary" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </Button>
        </form>
      </div>
      <p className="text-center text-xs text-cream/70">
        {signup ? "Already have an account? " : "New to Ember? "}
        <button
          type="button"
          className="focus-ring rounded font-bold text-ember-text underline-offset-2 hover:underline"
          onClick={() => {
            setMode(signup ? "signin" : "signup");
            setError(null);
          }}
        >
          {signup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- profile (server)

const EMPTY_ADDRESS: SavedAddress = { line1: "", line2: "", city: "", zip: "", instructions: "" };

export function ServerProfileForm({
  user,
  address,
  onSaved,
}: {
  user: AccountUser;
  address: SavedAddress | null;
  onSaved: (user: AccountUser, address: SavedAddress | null) => void;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [addr, setAddr] = useState<SavedAddress>(address ?? EMPTY_ADDRESS);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const { user: nextUser } = await updateProfile({ name, phone });
      let nextAddress: SavedAddress | null = address;
      const blank = !addr.line1.trim() && !addr.city.trim() && !addr.zip.trim();
      if (blank) {
        if (address) nextAddress = (await forgetAddress()).address;
      } else {
        nextAddress = (await saveAddress(addr)).address;
      }
      onSaved(nextUser, nextAddress);
      setSaved(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof SavedAddress) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" aria-label="Profile">
      <div className={cardClass}>
        <h3 className={headingClass}>Contact Info</h3>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Email" type="email" value={user.email} readOnly aria-readonly="true" hint="Your sign-in email." />
          <Field label="Full Name" type="text" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Morgan" />
          <Field label="Phone Number" type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. (555) 234-5678" />
        </div>
      </div>
      <div className={cardClass}>
        <h3 className={headingClass}>Default Delivery Address</h3>
        <p className="mt-1 text-[11px] text-cream/60">Optional. Saved to your account only if you fill it in; clear it to remove it.</p>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Street Address" type="text" autoComplete="address-line1" maxLength={200} value={addr.line1} onChange={set("line1")} placeholder="123 Main St" />
          <Field label="Apt, suite (optional)" type="text" autoComplete="address-line2" maxLength={100} value={addr.line2} onChange={set("line2")} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="City" type="text" autoComplete="address-level2" maxLength={60} value={addr.city} onChange={set("city")} />
            <Field label="ZIP Code" type="text" inputMode="numeric" autoComplete="postal-code" maxLength={10} value={addr.zip} onChange={set("zip")} />
          </div>
          <Field label="Delivery instructions (optional)" type="text" maxLength={300} value={addr.instructions} onChange={set("instructions")} />
        </div>
      </div>
      <FormError message={error} />
      <div className="flex items-center justify-between">
        <p role="status" className="text-xs font-bold text-emerald-400">
          {saved && (
            <span className="flex items-center gap-1.5">
              <Check size={16} aria-hidden="true" /> Saved to your account
            </span>
          )}
        </p>
        <Button type="submit" size="sm" variant="primary" disabled={busy}>
          {busy ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- security

export function SecurityPanel({ onSignedOut }: { onSignedOut: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <ChangePasswordForm />
      <SessionsCard onSignedOut={onSignedOut} />
      <DeleteAccountCard onDeleted={onSignedOut} />
    </div>
  );
}

function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next !== confirm) {
      setError("The new passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={cardClass} aria-labelledby="change-password-title">
      <h3 id="change-password-title" className={headingClass}>
        Change password
      </h3>
      <div className="mt-3 flex flex-col gap-3">
        <Field label="Current password" type="password" autoComplete="current-password" required maxLength={200} value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Field label="New password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} hint="At least 10 characters. Other devices will be signed out." value={next} onChange={(e) => setNext(e.target.value)} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <FormError message={error} />
        <p role="status" className="text-xs font-semibold text-emerald-400 empty:hidden">
          {done && "Password changed. Other devices have been signed out."}
        </p>
        <div className="flex justify-end">
          <Button type="submit" size="sm" variant="primary" icon={<KeyRound size={14} />} disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function SessionsCard({ onSignedOut }: { onSignedOut: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(everywhere: boolean) {
    setBusy(true);
    setError(null);
    try {
      await logOut(everywhere);
      onSignedOut();
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
    }
  }

  return (
    <section className={cardClass} aria-labelledby="sessions-title">
      <h3 id="sessions-title" className={headingClass}>
        Sessions
      </h3>
      <p className="mt-2 text-xs text-cream/70">
        Signing out everywhere ends every session for this account, on all devices, including this one.
      </p>
      <FormError message={error} />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="outline" icon={<LogOut size={14} />} disabled={busy} onClick={() => run(false)}>
          Sign out
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run(true)}>
          Log out everywhere
        </Button>
      </div>
    </section>
  );
}

function DeleteAccountCard({ onDeleted }: { onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (confirming) passwordRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      onDeleted();
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
    }
  }

  return (
    <section className={cardClass} aria-labelledby="delete-account-title">
      <h3 id="delete-account-title" className={headingClass}>
        Delete account
      </h3>
      <p className="mt-2 text-xs text-cream/70">
        Permanently deletes your account, saved address and sessions. Past orders are kept only as anonymous orders
        until they expire.
      </p>
      {confirming ? (
        <form onSubmit={submit} className="mt-3 rounded-xl border border-ember/40 bg-ember/10 p-3" aria-label="Confirm account deletion">
          <p className="text-xs font-semibold text-cream">Enter your password to delete your account. This can&apos;t be undone.</p>
          <label htmlFor="delete-account-password" className={`${labelClass} mt-3 block`}>
            Password
          </label>
          <input
            ref={passwordRef}
            id="delete-account-password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <div className="mt-2">
            <FormError message={error} />
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                returnFocus.current = true;
                setPassword("");
                setError(null);
                setConfirming(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="primary" icon={<Trash2 size={14} />} disabled={busy || !password}>
              {busy ? "Deleting…" : "Delete my account"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex justify-end">
          <Button ref={triggerRef} type="button" size="sm" variant="outline" icon={<Trash2 size={14} />} onClick={() => setConfirming(true)}>
            Delete account
          </Button>
        </div>
      )}
    </section>
  );
}
