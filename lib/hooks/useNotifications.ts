"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";

export function useNotifications() {
  const supabase = createClient();
  const { data, mutate } = useSWR<Notification[]>("notifications", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    return (data ?? []) as Notification[];
  });

  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => mutate())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = (data ?? []).filter((n) => !n.read).length;

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    mutate();
  }

  async function markAllAsRead() {
    const ids = (data ?? []).filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    mutate();
  }

  return { notifications: data ?? [], unreadCount, markAsRead, markAllAsRead, mutate };
}
