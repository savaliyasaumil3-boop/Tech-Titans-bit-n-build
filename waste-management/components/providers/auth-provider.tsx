"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type AppRole = "supervisor" | "driver";

export interface AuthProfile {
  id: string;
  role: AppRole;
  full_name: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  must_change_password: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeProfileRecord(data: Record<string, unknown> | null): AuthProfile | null {
  if (!data || typeof data.role !== "string") return null;
  const role = data.role as string;
  if (!["supervisor", "driver"].includes(role)) return null;

  return {
    id: String(data.id ?? ""),
    role: role as AppRole,
    full_name: typeof data.full_name === "string" ? data.full_name : null,
    driver_id: typeof data.driver_id === "string" ? data.driver_id : null,
    vehicle_id: typeof data.vehicle_id === "string" ? data.vehicle_id : null,
    must_change_password: Boolean((data as { must_change_password?: boolean | null }).must_change_password ?? false),
  };
}

function resolveRoleFromUser(user: User): AppRole {
  const rawRole = (user.user_metadata?.role ?? user.app_metadata?.role ?? "driver") as string | undefined;
  return rawRole === "supervisor" ? "supervisor" : "driver";
}

async function repairMissingProfile(user: User): Promise<AuthProfile | null> {
  if (!supabase) return null;

  const role = resolveRoleFromUser(user);
  const fallbackProfile: AuthProfile = {
    id: user.id,
    role,
    full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    driver_id: null,
    vehicle_id: null,
    must_change_password: false,
  };

  try {
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      role,
      full_name: fallbackProfile.full_name,
      driver_id: null,
      vehicle_id: null,
      must_change_password: false,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) {
      const message = error.message.toLowerCase();
      const isSchemaIssue = message.includes("does not exist") || message.includes("column") || message.includes("unknown column") || message.includes("not found");
      if (isSchemaIssue) {
        return fallbackProfile;
      }
      throw error;
    }

    const { data } = await supabase.from("profiles").select("id, role, full_name, driver_id, vehicle_id, must_change_password, is_active").eq("id", user.id).maybeSingle();
    return normalizeProfileRecord((data ?? fallbackProfile) as Record<string, unknown>) ?? fallbackProfile;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isSchemaIssue = message.toLowerCase().includes("does not exist") || message.toLowerCase().includes("column") || message.toLowerCase().includes("unknown column") || message.toLowerCase().includes("not found");
    if (isSchemaIssue) {
      return fallbackProfile;
    }
    throw error;
  }
}

async function loadProfile(user: User): Promise<AuthProfile> {
  if (!supabase) throw new Error("Authentication is not configured.");

  const fieldSets = [
    "id, role, full_name, driver_id, vehicle_id, must_change_password, is_active",
    "id, role, full_name, driver_id, vehicle_id, must_change_password",
    "id, role, full_name, driver_id, vehicle_id",
  ];

  let lastError: Error | null = null;

  for (const columns of fieldSets) {
    try {
      const { data, error } = await supabase.from("profiles").select(columns).eq("id", user.id).maybeSingle();
      if (!error && data) {
        const normalized = normalizeProfileRecord(data as unknown as Record<string, unknown>);
        if (normalized) {
          return normalized;
        }
        const repaired = await repairMissingProfile(user);
        if (repaired) return repaired;
      }

      if (!error && !data) {
        const repaired = await repairMissingProfile(user);
        if (repaired) return repaired;
      }

      if (error) {
        const message = error.message.toLowerCase();
        const isSchemaIssue = message.includes("does not exist") || message.includes("column") || message.includes("unknown column") || message.includes("not found");
        if (!isSchemaIssue) {
          throw error;
        }
        lastError = error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isSchemaIssue = message.toLowerCase().includes("does not exist") || message.toLowerCase().includes("column") || message.toLowerCase().includes("unknown column") || message.toLowerCase().includes("not found");
      if (isSchemaIssue) {
        lastError = error instanceof Error ? error : new Error("Profile schema mismatch.");
        continue;
      }
      throw error;
    }
  }

  if (lastError) {
    console.warn("Profile fallback query failed because the schema is older than the app expects:", lastError.message);
  }

  const repaired = await repairMissingProfile(user);
  if (repaired) return repaired;

  throw new Error("Your account has no assigned SwachhSetu role or the profiles table is not compatible with the app.");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error] = useState<string | null>(supabase ? null : "Authentication is not configured. Add the Supabase environment variables.");

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const client = supabase;
    let mounted = true;
    const hydrate = async () => {
      const { data } = await client.auth.getSession();
      if (!mounted) return;
      if (data.session?.user) {
        try {
          setUser(data.session.user);
          setProfile(await loadProfile(data.session.user));
        } catch (err) {
          await client.auth.signOut();
        }
      }
      setLoading(false);
    };
    void hydrate();
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error("Authentication is not configured.");
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) throw new Error(signInError?.message ?? "Login failed.");
    try {
      const nextProfile = await loadProfile(data.user);
      setUser(data.user);
      setProfile(nextProfile);
      router.replace(nextProfile.must_change_password ? "/login?mode=change" : nextProfile.role === "driver" ? "/driver/dashboard" : "/dashboard");
    } catch (err) {
      await supabase.auth.signOut();
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error("Authentication is not configured.");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?mode=reset`,
    });
    if (resetError) throw new Error(resetError.message);
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.replace("/login");
  };

  const changePassword = async (password: string) => {
    if (!supabase) throw new Error("Authentication is not configured.");
    if (password.length < 10) throw new Error("Password must be at least 10 characters.");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      throw new Error("Auth session missing. Please sign in again.");
    }

    const activeUser = user ?? sessionData.session.user;
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) throw new Error(passwordError.message);
    if (activeUser) {
      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ must_change_password: false, updated_at: new Date().toISOString() })
          .eq("id", activeUser.id);

        if (profileError) {
          const message = profileError.message.toLowerCase();
          if (!message.includes("does not exist") && !message.includes("column")) {
            throw new Error(profileError.message);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!message.toLowerCase().includes("does not exist") && !message.toLowerCase().includes("column")) {
          throw error;
        }
      }
      setProfile((current) => current ? { ...current, must_change_password: false } : current);
    }
  };

  return <AuthContext.Provider value={{ user, profile, loading, error, signIn, resetPassword, signOut, changePassword }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}