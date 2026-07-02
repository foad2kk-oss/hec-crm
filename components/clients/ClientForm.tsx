"use client";

import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { clientSchema, type ClientFormValues } from "@/lib/validations/client";
import { useLocale } from "@/lib/i18n";
import { useEngineers } from "@/lib/hooks/useProfile";
import { PIPELINE_STAGES } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagsInput } from "./TagsInput";
import type { Client } from "@/types/database";

interface ClientFormProps {
  defaultValues?: Partial<Client>;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  submitLabel: string;
}

export function ClientForm({ defaultValues, onSubmit, submitLabel }: ClientFormProps) {
  const { t } = useLocale();
  const engineers = useEngineers();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    defaultValues: {
      company_name: defaultValues?.company_name ?? "",
      contact_person: defaultValues?.contact_person ?? "",
      position: defaultValues?.position ?? "",
      mobile: defaultValues?.mobile ?? "",
      email: defaultValues?.email ?? "",
      website: defaultValues?.website ?? "",
      commercial_registration: defaultValues?.commercial_registration ?? "",
      industry: defaultValues?.industry ?? "",
      factory_type: defaultValues?.factory_type ?? "",
      city: defaultValues?.city ?? "",
      industrial_city: defaultValues?.industrial_city ?? "",
      project_status: defaultValues?.project_status ?? "",
      expected_construction_date: defaultValues?.expected_construction_date?.slice(0, 10) ?? "",
      estimated_budget: defaultValues?.estimated_budget ?? undefined,
      estimated_area: defaultValues?.estimated_area ?? undefined,
      owner_name: defaultValues?.owner_name ?? "",
      consultant: defaultValues?.consultant ?? "",
      contractor: defaultValues?.contractor ?? "",
      lead_source: defaultValues?.lead_source ?? "",
      expected_revenue: defaultValues?.expected_revenue ?? undefined,
      current_stage: defaultValues?.current_stage ?? "new_lead",
      next_followup: defaultValues?.next_followup?.slice(0, 10) ?? "",
      assigned_engineer_id: defaultValues?.assigned_engineer_id ?? "",
      notes: defaultValues?.notes ?? "",
      tags: defaultValues?.tags ?? [],
    },
  });

  const tags = watch("tags");
  const stage = watch("current_stage");
  const engineerId = watch("assigned_engineer_id");

  const field = (name: keyof ClientFormValues, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} {...register(name)} {...props} />
      {errors[name] && <p className="text-xs text-destructive">{String(errors[name]?.message)}</p>}
    </div>
  );

  async function handleValidatedSubmit(values: ClientFormValues) {
    const parsed = clientSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid form data");
      return;
    }
    await onSubmit(parsed.data);
  }

  return (
    <form
      onSubmit={handleSubmit(handleValidatedSubmit)}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {field("company_name", t.client.companyName)}
      {field("contact_person", t.client.contactPerson)}
      {field("position", t.client.position)}
      {field("mobile", t.client.mobile)}
      {field("email", t.client.email, { type: "email" })}
      {field("website", t.client.website)}
      {field("commercial_registration", t.client.commercialRegistration)}
      {field("industry", t.client.industry)}
      {field("factory_type", t.client.factoryType)}
      {field("city", t.client.city)}
      {field("industrial_city", t.client.industrialCity)}
      {field("project_status", t.client.projectStatus)}
      {field("expected_construction_date", t.client.expectedConstructionDate, { type: "date" })}
      {field("estimated_budget", t.client.estimatedBudget, { type: "number" })}
      {field("estimated_area", t.client.estimatedArea, { type: "number" })}
      {field("owner_name", t.client.ownerName)}
      {field("consultant", t.client.consultant)}
      {field("contractor", t.client.contractor)}
      {field("lead_source", t.client.leadSource)}
      {field("expected_revenue", t.client.expectedRevenue, { type: "number" })}
      {field("next_followup", t.client.nextFollowup, { type: "date" })}

      <div className="space-y-1.5">
        <Label>{t.client.currentStage}</Label>
        <Select value={stage} onValueChange={(v) => setValue("current_stage", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {t.stages[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t.client.assignedEngineer}</Label>
        <Select value={engineerId || undefined} onValueChange={(v) => setValue("assigned_engineer_id", v)}>
          <SelectTrigger>
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            {engineers.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label>{t.client.tags}</Label>
        <TagsInput value={tags} onChange={(v) => setValue("tags", v)} />
      </div>

      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label>{t.client.notes}</Label>
        <Textarea rows={3} {...register("notes")} />
      </div>

      <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
