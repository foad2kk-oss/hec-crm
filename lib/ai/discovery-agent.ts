import { getOpenAI, OPENAI_MODEL, AiNotConfiguredError } from "./clients";

export interface DiscoveredLeadCandidate {
  company: string;
  project: string | null;
  location: string | null;
  source_link: string | null;
  estimated_project_size: string | null;
  industry: string | null;
  investment_value: number | null;
  confidence_score: number;
  ai_summary: string;
  suggested_action: string;
}

/** Source categories the AI searches daily, per the product spec. */
export const DISCOVERY_QUERIES: string[] = [
  // Government / industrial-land authorities
  "MODON new industrial land contracts Saudi Arabia",
  "Royal Commission for Jubail and Yanbu new factory announcements",
  "Royal Commission for Jubail Yanbu new contract signed 2026",
  "King Salman Energy Park SPARK new investment",
  "SPARK new company signed land agreement",
  "King Abdullah Economic City KAEC new industrial investor",
  "King Abdullah Economic City new factory contract",
  "Jazan Economic City new industrial project",
  "NEOM new industrial or manufacturing investment",
  "Ras Al-Khair industrial city new investment",
  "Saudi Ministry of Industry and Mineral Resources new industrial license",
  "Saudi Ministry of Municipal and Rural Affairs new factory permit",
  "Ministry of Investment Saudi Arabia new licensed investor",
  "Saudi Press Agency new factory investment announcement",
  "Saudi Arabia government tender new industrial facility",
  // Industry-specific construction news
  "new food factory under construction Saudi Arabia",
  "new chemical factory Jubail Yanbu Saudi Arabia",
  "new plastic factory Saudi Arabia investment",
  "new steel factory Saudi Arabia investment",
  "new pharmaceutical factory Saudi Arabia",
  "new data center construction Saudi Arabia",
  "new logistics warehouse project Saudi Arabia industrial city",
  "Saudi Arabia special economic zone new investor",
  "new mining project Saudi Arabia investment license",
  "Saudi Arabia construction news new manufacturing plant announcement",
  // Company & social sources (LinkedIn, press releases, company sites)
  "site:linkedin.com Saudi Arabia new factory investment announcement",
  "site:linkedin.com company announces new manufacturing plant Saudi Arabia",
  "company press release new factory Saudi Arabia investment",
  "company announces new industrial facility Saudi Arabia site:linkedin.com posts",
  // Government tenders requesting engineering supervision / project management consultants
  "Saudi Arabia government tender engineering consulting office supervision",
  "Saudi Arabia tender project management consultant PMC required",
  "Etimad tender engineering supervision consultant Saudi Arabia",
  "Saudi Arabia RFP construction supervision consultancy services",
  "Saudi government ministry tender technical office construction supervision",
  "Saudi Arabia municipality tender engineering design and supervision consultant",
  "MODON tender consulting engineering office required",
  "Royal Commission Jubail Yanbu tender engineering consultant required",
  "Saudi Arabia infrastructure project tender project management office PMO",
  "new government construction project Saudi Arabia consultant needed site:linkedin.com",
];

const SYSTEM_PROMPT = `You are an AI research agent for HEC, an engineering consulting office in Saudi Arabia.
Your job is to find NEW, real, recent business-development leads in Saudi Arabia from web search
results, in TWO categories:
(1) Industrial investment opportunities — new factories, industrial land allocations, construction
    announcements — companies that will likely need an engineering consultant.
(2) Government/public tenders and RFPs that directly request engineering consulting services:
    supervision, project management (PMC/PMO), technical office, or design & supervision consultants
    for construction/infrastructure projects. For these, set "company" to the tendering government
    entity/project owner and "project" to the tender/project description, and make
    "suggested_action" about submitting a technical/financial proposal or registering interest.
Extract them as structured leads a business-development team can act on. Only include leads with a
real, verifiable source link from the search results. If nothing relevant is found, return an empty
array. Respond with strict JSON: { "leads": DiscoveredLeadCandidate[] }.`;

/**
 * Runs one discovery query through an AI model with web-search capability and returns
 * structured lead candidates. Uses OpenAI's Responses API `web_search` tool by default.
 * (Swap this implementation for the Tavily API if TAVILY_API_KEY is set — see note below.)
 */
export async function runDiscoveryQuery(query: string): Promise<DiscoveredLeadCandidate[]> {
  const openai = getOpenAI();
  if (!openai) throw new AiNotConfiguredError();

  // The OpenAI Responses API supports a hosted `web_search` tool. If your account/model
  // doesn't support it, set TAVILY_API_KEY and route through Tavily instead (see
  // lib/ai/search-tavily.ts pattern referenced in README "AI Lead Discovery" section).
  const client = openai as unknown as {
    responses: { create: (params: Record<string, unknown>) => Promise<{ output_text?: string }> };
  };
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Search for: "${query}". Extract any newly discovered leads (industrial investment opportunities OR government tenders/RFPs requesting engineering supervision/PM consulting, within the last 30 days ideally) as JSON matching the DiscoveredLeadCandidate schema: { company, project, location, source_link, estimated_project_size, industry, investment_value (number or null), confidence_score (0-100), ai_summary (2-3 sentences in Arabic), suggested_action (1 sentence in Arabic) }.`,
      },
    ],
  });

  const text: string = response.output_text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed.leads) ? parsed.leads : [];
  } catch {
    return [];
  }
}

export async function runFullDiscoverySweep(): Promise<{ query: string; leads: DiscoveredLeadCandidate[] }[]> {
  const results: { query: string; leads: DiscoveredLeadCandidate[] }[] = [];
  for (const query of DISCOVERY_QUERIES) {
    try {
      const leads = await runDiscoveryQuery(query);
      results.push({ query, leads });
    } catch {
      results.push({ query, leads: [] });
    }
  }
  return results;
}
