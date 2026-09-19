"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail, Recycle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const searchParams = useSearchParams();
  const { signIn, resetPassword, changePassword, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "reset" | "change">(searchParams.get("mode") === "reset" ? "reset" : searchParams.get("mode") === "change" ? "change" : "login");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "reset") {
        await resetPassword(email);
        setMessage("If this email is registered, a password reset link is on its way.");
      } else if (mode === "change") {
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        await changePassword(password);
        setMessage("Password updated. You can now open your driver dashboard.");
        window.location.assign(profile?.role === "driver" ? "/driver/dashboard" : "/dashboard");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:flex sm:items-center sm:justify-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted text-brand"><Recycle className="h-6 w-6" /></div>
          <div><p className="text-lg font-semibold tracking-tight">SwachhSetu</p><p className="text-sm text-muted-foreground">Collection operations</p></div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Sign in" : mode === "change" ? "Set your permanent password" : "Reset password"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mode === "change" ? "Your temporary password must be replaced before operational actions are enabled." : "Use your assigned account. Access is granted by your SwachhSetu role."}</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block space-y-2 text-sm font-medium">Work email<div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" autoComplete="email" /></div></label>
          {mode !== "reset" && <label className="block space-y-2 text-sm font-medium">{mode === "change" ? "New password" : "Password"}<div className="relative"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input required minLength={10} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" autoComplete={mode === "change" ? "new-password" : "current-password"} /></div></label>}
          {mode === "change" && <label className="block space-y-2 text-sm font-medium">Confirm new password<Input required minLength={10} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" /></label>}
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
          <Button type="submit" className="h-11 w-full" disabled={saving}>{saving ? "Working..." : mode === "login" ? "Sign in" : mode === "change" ? "Save permanent password" : "Email reset link"}</Button>
        </form>
        {mode !== "change" && <button type="button" className="mt-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => { setMode(mode === "login" ? "reset" : "login"); setError(null); setMessage(null); }}>{mode === "login" ? "Forgot password?" : <><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</>}</button>}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading sign in...</main>}><LoginForm /></Suspense>;
}