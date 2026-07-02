"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { File, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Attachment } from "@/types/database";

export function AttachmentsPanel({ clientId }: { clientId: string }) {
  const { locale, t } = useLocale();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: attachments, mutate } = useSWR<Attachment[]>(`attachments-${clientId}`, async () => {
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    return (data ?? []) as Attachment[];
  });

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const path = `clients/${clientId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) throw uploadError;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("attachments").insert({
        client_id: clientId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: user?.id,
      });
      if (error) throw error;
      mutate();
      toast.success(t.common.success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachment: Attachment) {
    await supabase.storage.from("documents").remove([attachment.storage_path]);
    await supabase.from("attachments").delete().eq("id", attachment.id);
    mutate();
  }

  async function handleOpen(attachment: Attachment) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(attachment.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{t.client.attachments}</CardTitle>
        <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {locale === "ar" ? "رفع ملف" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {(attachments ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
            <button onClick={() => handleOpen(a)} className="flex items-center gap-2 hover:underline">
              <File className="h-4 w-4 text-muted-foreground" />
              {a.file_name}
            </button>
            <Button size="icon" variant="ghost" onClick={() => handleDelete(a)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {(attachments ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">{t.common.noResults}</p>
        )}
      </CardContent>
    </Card>
  );
}
