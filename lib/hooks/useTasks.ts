"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/types/database";

export function useTasks() {
  const supabase = createClient();
  const { data, isLoading, mutate } = useSWR<Task[]>("tasks", async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assigned_to_fkey(*), client:clients(id, company_name)")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as unknown as Task[];
  });
  return { tasks: data ?? [], isLoading, mutate };
}

export interface TaskInput {
  title: string;
  description: string | null;
  assigned_to: string | null;
  client_id: string | null;
  due_date: string | null;
  priority: string;
}

export async function createTask(values: TaskInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("tasks").insert({ ...values, created_by: user?.id }).select().single();
  if (error) throw error;

  if (values.assigned_to) {
    await supabase.from("notifications").insert({
      user_id: values.assigned_to,
      type: "task_assigned",
      title: "مهمة جديدة",
      body: values.title,
      link: "/tasks",
    });
  }

  return data as Task;
}

export async function updateTaskProgress(id: string, progress: number) {
  const supabase = createClient();
  const status: TaskStatus = progress >= 100 ? "done" : progress > 0 ? "in_progress" : "todo";
  const { error } = await supabase.from("tasks").update({ progress, status }).eq("id", id);
  if (error) throw error;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const supabase = createClient();
  const progress = status === "done" ? 100 : status === "todo" ? 0 : undefined;
  const { error } = await supabase.from("tasks").update({ status, ...(progress !== undefined ? { progress } : {}) }).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
