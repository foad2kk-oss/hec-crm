import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Client, Meeting } from "@/types/database";

// NOTE: jsPDF's built-in fonts don't shape/reorder Arabic glyphs correctly out of the
// box. For production-quality Arabic PDFs, embed a Unicode Arabic font (e.g. Amiri or
// Noto Naskh Arabic .ttf converted with jsPDF's font converter) and call doc.addFont().
// These generators keep labels in English and print values (which may be Arabic) as-is —
// legible in most viewers, but full RTL shaping needs the font embed described above.

function header(doc: jsPDF, title: string) {
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138);
  doc.text("HEC — Business Development", 14, 18);
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 28);
  doc.setDrawColor(200);
  doc.line(14, 32, 196, 32);
}

export function generateCompanyProfilePdf(client: Client): jsPDF {
  const doc = new jsPDF();
  header(doc, `Company Profile — ${client.company_name}`);

  autoTable(doc, {
    startY: 38,
    head: [["Field", "Value"]],
    body: [
      ["Company", client.company_name],
      ["Contact", `${client.contact_person ?? "-"} (${client.position ?? "-"})`],
      ["Mobile / Email", `${client.mobile ?? "-"} / ${client.email ?? "-"}`],
      ["Website", client.website ?? "-"],
      ["Industry / Factory type", `${client.industry ?? "-"} / ${client.factory_type ?? "-"}`],
      ["City / Industrial city", `${client.city ?? "-"} / ${client.industrial_city ?? "-"}`],
      ["Project status", client.project_status ?? "-"],
      ["Estimated budget", client.estimated_budget ? `${client.estimated_budget} SAR` : "-"],
      ["Estimated area", client.estimated_area ? `${client.estimated_area} sqm` : "-"],
      ["Owner", client.owner_name ?? "-"],
      ["Lead source", client.lead_source ?? "-"],
      ["AI lead score", `${client.lead_score} (${client.priority})`],
      ["Current stage", client.current_stage],
      ["Notes", client.notes ?? "-"],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  return doc;
}

export function generateProposalPdf(client: Client, content: string): jsPDF {
  const doc = new jsPDF();
  header(doc, `Engineering Consulting Proposal — ${client.company_name}`);
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(content, 180);
  doc.text(lines, 14, 42);
  return doc;
}

export function generateTableReportPdf(title: string, columns: string[], rows: (string | number)[][]): jsPDF {
  const doc = new jsPDF();
  header(doc, title);
  autoTable(doc, {
    startY: 38,
    head: [columns],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 138] },
  });
  return doc;
}

export function generateMeetingMinutesPdf(meeting: Meeting, clientName: string): jsPDF {
  const doc = new jsPDF();
  header(doc, `Meeting Minutes — ${meeting.title}`);

  doc.setFontSize(10);
  doc.text(`Client: ${clientName}`, 14, 40);
  doc.text(`Date: ${new Date(meeting.starts_at).toLocaleString()}`, 14, 46);
  doc.text(`Location: ${meeting.location ?? "-"}`, 14, 52);

  const lines = doc.splitTextToSize(meeting.minutes || meeting.agenda || "-", 180);
  doc.text(lines, 14, 62);

  if (meeting.action_items && meeting.action_items.length > 0) {
    autoTable(doc, {
      startY: 62 + lines.length * 5 + 10,
      head: [["Action item", "Due date", "Done"]],
      body: meeting.action_items.map((i) => [i.description, i.due_date ?? "-", i.done ? "Yes" : "No"]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] },
    });
  }

  return doc;
}
