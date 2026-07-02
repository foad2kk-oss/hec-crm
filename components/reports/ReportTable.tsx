"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportToExcel, exportToCsv } from "@/lib/excel";
import { generateTableReportPdf } from "@/lib/pdf";
import { useLocale } from "@/lib/i18n";

export function ReportTable({
  title,
  columns,
  rows,
  filename,
}: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  filename: string;
}) {
  const { t } = useLocale();
  const asObjects = () => rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => exportToExcel(filename, asObjects())}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToCsv(filename, asObjects())}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateTableReportPdf(title, columns, rows).save(`${filename}.pdf`)}
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {t.common.noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
