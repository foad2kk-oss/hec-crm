import type { Client, Meeting } from "@/types/database";

const clientContext = (c: Partial<Client>) => `
Company: ${c.company_name}
Contact: ${c.contact_person ?? "-"} (${c.position ?? "-"})
Industry: ${c.industry ?? "-"} / Factory type: ${c.factory_type ?? "-"}
City: ${c.city ?? "-"} / Industrial city: ${c.industrial_city ?? "-"}
Project status: ${c.project_status ?? "-"}
Estimated budget: ${c.estimated_budget ?? "-"} SAR / Area: ${c.estimated_area ?? "-"} sqm
Current stage: ${c.current_stage ?? "-"}
Notes: ${c.notes ?? "-"}
`.trim();

export const assistantPrompts = {
  summarizeCompany: (c: Partial<Client>) => ({
    system:
      "You are a business-development analyst for an engineering consulting firm in Saudi Arabia. Write concise, useful summaries in Arabic unless asked otherwise.",
    prompt: `اكتب ملخصاً تنفيذياً موجزاً (5-6 أسطر) عن هذه الشركة كفرصة عمل محتملة لمكتب استشارات هندسية:\n\n${clientContext(c)}`,
  }),

  meetingPrep: (c: Partial<Client>, meetingTitle?: string) => ({
    system: "You prepare crisp meeting-preparation briefs for engineering sales meetings, in Arabic.",
    prompt: `جهّز ملاحظات تحضيرية للاجتماع${meetingTitle ? ` "${meetingTitle}"` : ""} مع هذه الشركة، تتضمن: نقاط النقاش الرئيسية، الأسئلة الواجب طرحها، والمخاطر المحتملة:\n\n${clientContext(c)}`,
  }),

  draftEmail: (c: Partial<Client>, lang: "ar" | "en", purpose: string) => ({
    system:
      lang === "ar"
        ? "أنت مساعد يكتب رسائل بريد إلكتروني احترافية للمبيعات الهندسية باللغة العربية الفصحى."
        : "You write professional, concise business-development emails in English for an engineering consulting firm.",
    prompt:
      lang === "ar"
        ? `اكتب رسالة بريد إلكتروني احترافية بالعربية بخصوص: ${purpose}\n\nمعلومات العميل:\n${clientContext(c)}`
        : `Write a professional email in English regarding: ${purpose}\n\nClient info:\n${clientContext(c)}`,
  }),

  proposalDraft: (c: Partial<Client>) => ({
    system: "You draft engineering-consulting proposal outlines for industrial clients in Saudi Arabia, in Arabic.",
    prompt: `أنشئ مسودة عرض استشاري أولي (نطاق العمل المقترح، الخدمات، مدة التنفيذ التقديرية) لهذا العميل:\n\n${clientContext(c)}`,
  }),

  followUpEmail: (c: Partial<Client>) => ({
    system: "أنت مساعد مبيعات هندسي يكتب رسائل متابعة مهذبة وفعالة بالعربية.",
    prompt: `اكتب رسالة متابعة قصيرة لهذا العميل الذي لم يتم التواصل معه مؤخراً:\n\n${clientContext(c)}`,
  }),

  meetingSummary: (m: Partial<Meeting>, notes: string) => ({
    system: "You summarize business meetings into clear minutes with action items, in Arabic.",
    prompt: `لخّص هذا الاجتماع "${m.title}" إلى محضر اجتماع منظم مع بنود العمل المطلوبة بناءً على الملاحظات التالية:\n\n${notes}`,
  }),

  suggestNextAction: (c: Partial<Client>) => ({
    system: "You are a sales-pipeline advisor for an engineering consulting office.",
    prompt: `بناءً على بيانات هذا العميل، اقترح الإجراء التالي الأنسب لتحريك الصفقة للأمام (جملة أو جملتين فقط):\n\n${clientContext(c)}`,
  }),

  extractDecisionMakers: (text: string) => ({
    system:
      "You extract likely decision-makers (name, title, relevance) from pasted LinkedIn/company text. Respond with strict JSON: { decision_makers: [{name, title, relevance}] }. relevance must be 1 short sentence in Arabic. If the text has no real names/titles, return an empty array — never invent people.",
    prompt: `Extract decision makers from this text:\n\n${text}`,
  }),

  suggestEngineer: (c: Partial<Client>, engineers: { id: string; full_name: string; department: string | null }[]) => ({
    system:
      "You recommend which engineer should attend a client meeting based on industry fit and department. " +
      "You MUST pick engineer_id from the exact list of ids provided — never invent an id. " +
      'Respond with strict JSON: { engineer_id, reason }. reason must be 1-2 sentences in Arabic explaining why.',
    prompt: `Client:\n${clientContext(c)}\n\nAvailable engineers (pick engineer_id only from this list):\n${JSON.stringify(engineers, null, 2)}\n\nWhich engineer is the best fit to attend a meeting with this client?`,
  }),

  draftOutreachToPerson: (
    c: Partial<Client>,
    person: { name: string; title: string },
    lang: "ar" | "en"
  ) => ({
    system:
      lang === "ar"
        ? "أنت مساعد أعمال تكتب رسائل تواصل أولى مباشرة وشخصية لصناع القرار، بالعربية الفصحى، بأسلوب احترافي ومختصر."
        : "You write short, professional, personalized first-outreach emails to decision-makers for an engineering consulting firm.",
    prompt:
      lang === "ar"
        ? `اكتب رسالة تواصل أولى مباشرة إلى "${person.name}" (${person.title}) بخصوص خدمات الاستشارات الهندسية لمشروعهم، تتضمن مقدمة موجزة عن مكتبنا وطلب اجتماع قصير. خاطبه بالاسم مباشرة.\n\nمعلومات الشركة/المشروع:\n${clientContext(c)}`
        : `Write a short, personalized first-outreach email to "${person.name}" (${person.title}) about our engineering consulting services for their project, with a brief intro and a request for a short meeting. Address them by name directly.\n\nCompany/project info:\n${clientContext(c)}`,
  }),
};
