import type { Runnable } from "@langchain/core/runnables";
import type { BaseMessageLike } from "@langchain/core/messages";
import type { AIMessageChunk } from "@langchain/core/messages";
import { z } from "zod";
import { configuredProviders } from "../lib/env";
import { buildProviderModel, type ModelOptions } from "./providers";

/**
 * The LLM Gateway.
 *
 * Builds one ChatOpenAI client per *configured* provider (in `LLM_PROVIDER_ORDER`,
 * default openrouter → mistral → groq) and chains them with `.withFallbacks()` so a
 * rate-limit / error on the primary automatically rolls to the next provider. This is
 * the project's core defense against free-tier rate limits.
 */
export type GatewayModel = Runnable<BaseMessageLike[], AIMessageChunk>;

export function hasLLM(): boolean {
  return configuredProviders().length > 0;
}

export function getChatModel(opts: ModelOptions = {}): GatewayModel {
  const providers = configuredProviders();
  if (providers.length === 0) {
    throw new Error(
      "No LLM provider configured. Set an API key for openrouter, mistral, or groq.",
    );
  }
  const models = providers.map((p) => buildProviderModel(p, opts));
  const [primary, ...rest] = models;
  return (rest.length ? primary.withFallbacks(rest) : primary) as GatewayModel;
}

/** Invoke the gateway and return plain text content. */
export async function invokeText(
  messages: BaseMessageLike[],
  opts: ModelOptions = {},
): Promise<string> {
  const model = getChatModel(opts);
  const res = await model.invoke(messages);
  return typeof res.content === "string"
    ? res.content
    : JSON.stringify(res.content);
}

/** Stream the gateway response token-by-token. */
export async function* streamText(
  messages: BaseMessageLike[],
  opts: ModelOptions = {},
): AsyncGenerator<string> {
  const model = getChatModel({ ...opts, streaming: true });
  const stream = await model.stream(messages);
  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : "";
    if (text) yield text;
  }
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/im, "")
    .trim();
}

/** Best-effort: pull the first balanced JSON object/array out of a noisy completion. */
function extractJson(raw: string): string {
  const cleaned = stripJsonFences(raw);
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  const start =
    firstArr === -1
      ? firstObj
      : firstObj === -1
        ? firstArr
        : Math.min(firstObj, firstArr);
  if (start === -1) return cleaned;
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === open) depth++;
    else if (cleaned[i] === close) {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return cleaned.slice(start);
}

/**
 * Ask the gateway for JSON matching a Zod schema, with one self-repair pass.
 * Replaces the old brittle hand-written `parseAndValidate`; works with any
 * OpenAI-compatible free model (no native tool-calling required).
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userPrompt: string,
  opts: ModelOptions = {},
): Promise<T> {
  const sys = `${systemPrompt}\n\nReturn ONLY a single valid JSON value. No markdown, no code fences, no commentary.`;

  const first = await invokeText(
    [
      { role: "system", content: sys },
      { role: "user", content: userPrompt },
    ],
    opts,
  );

  const tryParse = (text: string): T | null => {
    try {
      return schema.parse(JSON.parse(extractJson(text)));
    } catch {
      return null;
    }
  };

  const parsed = tryParse(first);
  if (parsed) return parsed;

  console.log(
    "[generateStructured] First attempt failed. Raw output:",
    first.slice(0, 500),
  );

  // One repair pass: hand the model its own output + the parse goal and ask for clean JSON.
  const repaired = await invokeText(
    [
      { role: "system", content: sys },
      { role: "user", content: userPrompt },
      { role: "assistant", content: first },
      {
        role: "user",
        content:
          "Your previous reply was not valid JSON matching the required shape. Reply again with ONLY the corrected JSON value — no prose, no code fences.",
      },
    ],
    opts,
  );

  const fixed = tryParse(repaired);
  if (fixed) return fixed;

  console.log(
    "[generateStructured] Repair attempt also failed. Raw output:",
    repaired.slice(0, 500),
  );

  throw new Error(
    "LLM did not return JSON matching the expected schema after a repair attempt.",
  );
}
