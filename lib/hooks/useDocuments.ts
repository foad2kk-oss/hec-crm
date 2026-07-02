"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { AppDocument, DocumentType } from "@/types/database";

export function useDocuments() {
  const supabase = createClient();
  const { data, isLoading, mutate } = useSWR<(AppDocument & { client?: { company_name: string } | null })[]>(
    "documents",
    async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, client:clients(company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (AppDocument & { client?: { company_name: string } | null })[];
    }
  );
  return { documents: data ?? [], isLoading, mutate };
}

export async function uploadDocument(file: File, clientId: string | null, name: string, type: DocumentType) {
  const supabase = createClient();
  const path = `library/${clientId ?? "general"}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
  if (uploadError) throw uploadError;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("documents")
    .insert({ client_id: clientId, name, type, storage_path: path, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as AppDocument;
}

export async function saveGeneratedPdf(blob: Blob, clientId: string, name: string, type: DocumentType) {
  const supabase = createClient();
  const path = `library/${clientId}/${Date.now()}-${name}.pdf`;
  const { error: uploadError } = await supabase.storage.from("documents").upload(path, blob, {
    contentType: "application/pdf",
  });
  if (uploadError) throw uploadError;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("documents")
    .insert({ client_id: clientId, name: `${name}.pdf`, type, storage_path: path, created_by: user?.id });
  if (error) throw error;
}

export async function getDocumentUrl(storagePath: string) {
  const supabase = createClient();
  const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60);
  return data?.signedUrl ?? null;
}

export async function deleteDocument(id: string, storagePath: string) {
  const supabase = createClient();
  await supabase.storage.from("documents").remove([storagePath]);
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}
