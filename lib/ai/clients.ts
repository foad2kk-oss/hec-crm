import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export const AI_PROVIDER = (process.env.AI_PROVIDER || "openai") as "openai" | "anthropic";
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in your environment.");
    this.name = "AiNotConfiguredError";
  }
}

/** Thrown when the AI provider rejects a request due to no/insufficient billing credit or a rate limit. */
export class AiQuotaExceededError extends Error {
  constructor(providerMessage: string) {
    super(
      `AI provider quota/billing error: ${providerMessage}. Add credit to your OpenAI/Anthropic account and try again.`
    );
    this.name = "AiQuotaExceededError";
  }
}

/** Detects OpenAI/Anthropic SDK errors caused by empty billing/quota or rate limits, and rethrows a clear error. */
export function rethrowIfQuotaError(err: unknown): never {
  const e = err as { status?: number; code?: string; message?: string };
  const message = e?.message || "";
  const looksLikeQuota =
    e?.status === 429 ||
    e?.code === "insufficient_quota" ||
    /quota|billing|credit balance|insufficient/i.test(message);
  if (looksLikeQuota) {
    throw new AiQuotaExceededError(message || "quota exceeded");
  }
  throw err;
}

/**
 * Provider-agnostic JSON completion: sends a system + user prompt, asks the model to
 * return strict JSON, and parses it. Falls back between OpenAI / Anthropic based on
 * AI_PROVIDER, whichever has a key configured.
 */
export async function completeJson<T = unknown>(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<T> {
  const { system, prompt, maxTokens = 1500 } = params;
  const openai = getOpenAI();
  const anthropic = getAnthropic();
  const preferAnthropic = AI_PROVIDER === "anthropic" && anthropic;

  if (!openai && !anthropic) throw new AiNotConfiguredError();

  try {
    if (preferAnthropic) {
      const res = await anthropic!.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system: `${system}\nRespond with ONLY valid JSON, no markdown fences, no commentary.`,
        messages: [{ role: "user", content: prompt }],
      });
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    }

    const res = await openai!.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
    });
    return JSON.parse(res.choices[0]?.message?.content || "{}");
  } catch (err) {
    rethrowIfQuotaError(err);
  }
}

/** Provider-agnostic plain-text completion (streaming not required). */
export async function completeText(params: { system: string; prompt: string; maxTokens?: number }): Promise<string> {
  const { system, prompt, maxTokens = 1200 } = params;
  const openai = getOpenAI();
  const anthropic = getAnthropic();
  const preferAnthropic = AI_PROVIDER === "anthropic" && anthropic;

  if (!openai && !anthropic) throw new AiNotConfiguredError();

  try {
    if (preferAnthropic) {
      const res = await anthropic!.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    }

    const res = await openai!.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    });
    return res.choices[0]?.message?.content || "";
  } catch (err) {
    rethrowIfQuotaError(err);
  }
}
