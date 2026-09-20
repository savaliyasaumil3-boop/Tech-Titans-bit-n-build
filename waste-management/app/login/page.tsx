"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Copy, Info, KeyRound, LockKeyhole, Mail, Recycle, RefreshCw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO_CREDENTIALS = {
  supervisor: {
    roleName: "Supervisor",
    icon: ShieldCheck,
    email: "supervisor@swachhsetu.in",
    password: "SwachhSetu!Sup2026#",
    portal: "Supervisor Control Center",
  },
  driver: {
    roleName: "Truck Driver",
    icon: Truck,
    email: "driver@swachhsetu.in",
    password: "SwachhSetu!Driver2026#",
    portal: "Driver Route & Shift",
  },
} as const;

function LoginForm() {
  const searchParams = useSearchParams();
  const { signIn, resetPassword, changePassword, profile, user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"supervisor" | "driver">("supervisor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "reset" | "change">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const modeFromQuery = searchParams.get("mode");
  const resolvedMode = modeFromQuery === "reset" ? "reset" : modeFromQuery === "change" ? "change" : "login";

  useEffect(() => {
    setMode(resolvedMode);
  }, [resolvedMode]);

  if (mode === "change" && !user) {
    return (
      <main className="min-h-screen bg-background px-5 py-10 sm:flex sm:items-center sm:justify-center">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Auth session missing. Please sign in again.</p>
        </section>
      </main>
    );
  }

  const fillDemoCredentials = (role: "supervisor" | "driver") => {
    const creds = DEMO_CREDENTIALS[role];
    setSelectedRole(role);
    setEmail(creds.email);
    setPassword(creds.password);
    setError(null);
    setMessage(`Loaded demo credentials for ${creds.roleName}. Click 'Sign in' to continue.`);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(id);
    setTimeout(() => {
      setCopiedKey((current) => (current === id ? null : current));
    }, 2000);
  };

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
        setMessage("Password updated.");
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
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted text-brand"><Recycle className="h-6 w-6" /></div>
          <div><p className="text-lg font-semibold tracking-tight">SwachhSetu</p><p className="text-sm text-muted-foreground">Collection operations</p></div>
        </div>

        {/* Role Selector Tabs */}
        {mode === "login" && (
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => { setSelectedRole("supervisor"); setError(null); }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 transition-all ${
                selectedRole === "supervisor"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-brand" />
              Supervisor
            </button>
            <button
              type="button"
              onClick={() => { setSelectedRole("driver"); setError(null); }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 transition-all ${
                selectedRole === "driver"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Truck className="h-4 w-4 text-brand" />
              Driver
            </button>
          </div>
        )}

        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "login"
            ? `${selectedRole === "supervisor" ? "Supervisor" : "Driver"} Sign in`
            : mode === "change"
            ? "Set your permanent password"
            : "Reset password"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "change"
            ? "Your temporary password must be replaced before operational actions are enabled."
            : `Log in to access the ${selectedRole === "supervisor" ? "Municipal Supervisor Control Center" : "Driver Route & Shift Dashboard"}.`}
        </p>

        {/* Render Free Server Notice */}
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-md bg-amber-500/20 p-1 text-amber-700 dark:text-amber-300 shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                Server Cold Start Notice
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-200">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Render Free Tier
                </span>
              </p>
              <p className="text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                Render backend servers spin down when idle and take ~1 minute to spin up upon receiving a request. If logging in fails or takes long, please <strong>wait 1 minute, refresh the page, and try logging in again</strong>.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode !== "change" && (
            <label className="block space-y-2 text-sm font-medium">
              Work email
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === "supervisor" ? "supervisor@swachhsetu.in" : "driver@swachhsetu.in"}
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </label>
          )}

          {mode !== "reset" && (
            <label className="block space-y-2 text-sm font-medium">
              {mode === "change" ? "New password" : "Password"}
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  minLength={mode === "change" ? 10 : 1}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  autoComplete={mode === "change" ? "new-password" : "current-password"}
                />
              </div>
            </label>
          )}

          {mode === "change" && (
            <label className="block space-y-2 text-sm font-medium">
              Confirm new password
              <Input
                required
                minLength={10}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
          )}

          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}

          <Button type="submit" className="h-11 w-full" disabled={saving}>
            {saving
              ? "Working..."
              : mode === "login"
              ? `Sign in as ${selectedRole === "supervisor" ? "Supervisor" : "Driver"}`
              : mode === "change"
              ? "Save permanent password"
              : "Email reset link"}
          </Button>
        </form>

        {/* Demo Credentials Box */}
        {mode === "login" && (
          <div className="mt-6 rounded-xl border border-border/80 bg-muted/30 p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5 text-brand" />
                <span>Demo Credentials</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Click to auto-fill</span>
            </div>

            <div className="space-y-2">
              {(["supervisor", "driver"] as const).map((role) => {
                const creds = DEMO_CREDENTIALS[role];
                const Icon = creds.icon;
                const isSelected = selectedRole === role && email === creds.email && password === creds.password;

                return (
                  <div
                    key={role}
                    role="button"
                    tabIndex={0}
                    onClick={() => fillDemoCredentials(role)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fillDemoCredentials(role);
                      }
                    }}
                    className={`group relative flex items-center justify-between rounded-lg border p-2.5 text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected
                        ? "border-brand bg-brand-muted/25 shadow-xs"
                        : "border-border/70 bg-card/80 hover:border-border hover:bg-card"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="text-xs font-semibold text-foreground">{creds.roleName}</span>
                        <span className="text-[10px] text-muted-foreground truncate">({creds.portal})</span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-[11px]">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground/70 w-9 shrink-0">Email:</span>
                          <span className="font-mono text-foreground/90 font-medium truncate">{creds.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground/70 w-9 shrink-0">Pass:</span>
                          <span className="font-mono text-foreground/90 font-medium truncate">{creds.password}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(`${creds.email} | ${creds.password}`, `${role}-all`);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        title="Copy credentials"
                      >
                        {copiedKey === `${role}-all` ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <Button
                        type="button"
                        size="xs"
                        variant={isSelected ? "default" : "secondary"}
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          fillDemoCredentials(role);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            <span>Fill</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mode !== "change" && (
          <button
            type="button"
            className="mt-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setMode(mode === "login" ? "reset" : "login");
              setError(null);
              setMessage(null);
            }}
          >
            {mode === "login" ? "Forgot password?" : <><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</>}
          </button>
        )}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading sign in...</main>}><LoginForm /></Suspense>;
}