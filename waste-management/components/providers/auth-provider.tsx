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
}

interface AuthContextValue {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(user: User): Promise<AuthProfile> {
  if (!supabase) throw new Error("Authentication is not configured.");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, driver_id, vehicle_id")
    .eq("id", user.id)
    .single();
  if (error || !data || !["supervisor", "driver"].includes(data.role)) {
    throw new Error("Your account has no assigned SwachhSetu role.");
  }
  return data as AuthProfile;
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
      router.replace(nextProfile.role === "driver" ? "/driver/dashboard" : "/dashboard");
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

  return <AuthContext.Provider value={{ user, profile, loading, error, signIn, resetPassword, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}