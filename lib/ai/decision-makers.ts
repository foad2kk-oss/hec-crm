import { getOpenAI, OPENAI_MODEL, AiNotConfiguredError, rethrowIfQuotaError } from "./clients";
import type { Client } from "@/types/database";

export interface DecisionMaker {
  name: string;
  title: string;
  relevance: string;
  source_link: string | null;
}

const SYSTEM_PROMPT = `You are a business-development research agent for an engineering consulting office in
Saudi Arabia. Given a company, search the web (LinkedIn profiles/posts, the company website, news) to find
REAL, currently-active decision-makers who would be involved in hiring an engineering consultant (CEO,
General Manager, Owner, Projects/Procurement Director, Technical Manager). Only include people you found
real evidence for, with a source link. Never invent names. If nothing reliable is found, return an empty
array. Respond with strict JSON: { "decision_makers": [{ "name", "title", "relevance" (1 Arabic sentence
on why they matter), "source_link" }] }.`;

/**
 * Searches the web for real decision-makers at a company, using OpenAI's hosted `web_search` tool
 * (same approach as the AI Lead Discovery agent). This replaces the need to manually paste LinkedIn
 * text — the user only needs to have the client's company name/website on file.
 */
export async function searchDecisionMakersOnline(client: Partial<Client>): Promise<DecisionMaker[]> {
  const openai = getOpenAI();
  if (!openai) throw new AiNotConfiguredError();

  const clientApi = openai as unknown as {
    responses: { create: (params: Record<string, unknown>) => Promise<{ output_text?: string }> };
  };

  let response: { output_text?: string };
  try {
    response = await clientApi.responses.create({
      model: OPENAI_MODEL,
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Company: ${client.company_name}
Industry: ${client.industry ?? "-"}
Website: ${client.website ?? "-"}
City: ${client.city ?? "-"}

Search LinkedIn and the web for this company's likely decision-makers regarding engineering/construction
consulting needs. Return the JSON described in the system prompt.`,
        },
      ],
    });
  } catch (err) {
    rethrowIfQuotaError(err);
  }

  const text: string = response.output_text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed.decision_makers) ? parsed.decision_makers : [];
  } catch {
    return [];
  }
}
