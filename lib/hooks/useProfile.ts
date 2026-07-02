"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export function useProfile() {
  const supabase = createClient();
  const { data, error, isLoading, mutate } = useSWR<Profile | null>("profile", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    return profile as Profile | null;
  });

  return { profile: data, isLoading, error, mutate };
}

export function useEngineers() {
  const supabase = createClient();
  const { data } = useSWR<Profile[]>("engineers", async () => {
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    return (data ?? []) as Profile[];
  });
  return data ?? [];
}
