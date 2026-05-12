import { ChatOpenAI } from "@langchain/openai";
import { env, type ProviderName } from "../lib/env";

interface ProviderConfig {
  apiKey: string;
  model: string;
  baseURL: string;
}

function configFor(provider: ProviderName): ProviderConfig {
  switch (provider) {
    case "openrouter":
      return {
        apiKey: env.OPENROUTER_API_KEY,
        model: env.OPENROUTER_MODEL,
        baseURL: env.OPENROUTER_BASE_URL,
      };
    case "mistral":
      return {
        apiKey: env.MISTRAL_API_KEY,
        model: env.MISTRAL_MODEL,
        baseURL: env.MISTRAL_BASE_URL,
      };
    case "groq":
      return {
        apiKey: env.GROQ_API_KEY,
        model: env.GROQ_MODEL,
        baseURL: env.GROQ_BASE_URL,
      };
  }
}

export interface ModelOptions {
  temperature?: number;
  streaming?: boolean;
  maxTokens?: number;
}

/** Build a LangChain ChatOpenAI client pointed at a given OpenAI-compatible provider. */
export function buildProviderModel(
  provider: ProviderName,
  opts: ModelOptions = {},
): ChatOpenAI {
  const { apiKey, model, baseURL } = configFor(provider);
  return new ChatOpenAI({
    apiKey,
    model,
    temperature: opts.temperature ?? 0.6,
    streaming: opts.streaming ?? false,
    maxTokens: opts.maxTokens,
    // Make a single attempt per provider so the gateway can fail over quickly on 429.
    maxRetries: 0,
    timeout: 45_000,
    configuration: {
      baseURL,
      defaultHeaders: {
        "HTTP-Referer": env.FRONTEND_URL,
        "X-Title": "Cognita",
      },
    },
    metadata: { provider },
  });
}
