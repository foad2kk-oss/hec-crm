"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Download, FileText, Loader2, Trash2, Upload, Wand2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useClients } from "@/lib/hooks/useClients";
import { useDocuments, uploadDocument, saveGeneratedPdf, getDocumentUrl, deleteDocument } from "@/lib/hooks/useDocuments";
import { generateCompanyProfilePdf, generateProposalPdf } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { DocumentType } from "@/types/database";

const DOC_TYPES: { value: DocumentType; ar: string; en: string }[] = [
  { value: "company_profile", ar: "ملف الشركة", en: "Company Profile" },
  { value: "brochure", ar: "بروشور", en: "Brochure" },
  { value: "technical_proposal", ar: "عرض فني", en: "Technical Proposal" },
  { value: "financial_proposal", ar: "عرض مالي", en: "Financial Proposal" },
  { value: "contract", ar: "عقد", en: "Contract" },
  { value: "meeting_minutes", ar: "محضر اجتماع", en: "Meeting Minutes" },
  { value: "presentation", ar: "عرض تقديمي", en: "Presentation" },
  { value: "other", ar: "أخرى", en: "Other" },
];

export default function DocumentsPage() {
  const { t, locale } = useLocale();
  const { clients } = useClients();
  const { documents, isLoading, mutate } = useDocuments();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadClientId, setUploadClientId] = useState<string>("");
  const [uploadType, setUploadType] = useState<DocumentType>("other");
  const [genClientId, setGenClientId] = useState<string>("");
  const [generating, setGenerating] = useState<string | null>(null);

  async function handleUpload(file: File) {
    try {
      await uploadDocument(file, uploadClientId || null, file.name, uploadType);
      toast.success(t.common.success);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    }
  }

  async function handleGenerateProfile() {
    if (!genClientId) return;
    setGenerating("profile");
    try {
      const client = clients.find((c) => c.id === genClientId)!;
      const doc = generateCompanyProfilePdf(client);
      const blob = doc.output("blob");
      doc.save(`${client.company_name}-profile.pdf`);
      await saveGeneratedPdf(blob, genClientId, "Company Profile", "company_profile");
      mutate();
    } finally {
      setGenerating(null);
    }
  }

  async function handleGenerateProposal() {
    if (!genClientId) return;
    setGenerating("proposal");
    try {
      const client = clients.find((c) => c.id === genClientId)!;
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "proposal", clientId: genClientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const doc = generateProposalPdf(client, data.text);
      const blob = doc.output("blob");
      doc.save(`${client.company_name}-proposal.pdf`);
      await saveGeneratedPdf(blob, genClientId, "Proposal Draft", "technical_proposal");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setGenerating(null);
    }
  }

  async function handleOpen(storagePath: string) {
    const url = await getDocumentUrl(storagePath);
    if (url) window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.nav.documents}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" /> {locale === "ar" ? "رفع مستند" : "Upload document"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Select value={uploadClientId} onValueChange={setUploadClientId}>
              <SelectTrigger className="w-48"><SelectValue placeholder={t.client.companyName} /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={uploadType} onValueChange={(v) => setUploadType(v as DocumentType)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{locale === "ar" ? d.ar : d.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" /> {t.common.add}
            </Button>
            <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4" /> {locale === "ar" ? "توليد مستند بالذكاء الاصطناعي" : "Generate document"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Select value={genClientId} onValueChange={setGenClientId}>
              <SelectTrigger className="w-48"><SelectValue placeholder={t.client.companyName} /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" disabled={!genClientId || !!generating} onClick={handleGenerateProfile}>
              {generating === "profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {locale === "ar" ? "ملف الشركة" : "Company Profile"}
            </Button>
            <Button variant="outline" disabled={!genClientId || !!generating} onClick={handleGenerateProposal}>
              {generating === "proposal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {locale === "ar" ? "عرض استشاري" : "Proposal"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{locale === "ar" ? "الاسم" : "Name"}</TableHead>
              <TableHead>{t.client.companyName}</TableHead>
              <TableHead>{locale === "ar" ? "النوع" : "Type"}</TableHead>
              <TableHead>{locale === "ar" ? "التاريخ" : "Date"}</TableHead>
              <TableHead>{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.client?.company_name ?? "-"}</TableCell>
                <TableCell>{DOC_TYPES.find((dt) => dt.value === d.type)?.[locale] ?? d.type}</TableCell>
                <TableCell>{formatDate(d.created_at, locale)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleOpen(d.storage_path)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        await deleteDocument(d.id, d.storage_path);
                        mutate();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {t.common.noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
