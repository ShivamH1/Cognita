import dotenv from "dotenv"
import { z } from "zod"

// Load env files
dotenv.config()

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),

  // Data stores
  DATABASE_URL: z.string().default("postgresql://cognita:cognita@localhost:5432/cognita?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  QDRANT_URL: z.string().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().default(""),

  // Embeddings (local Transformers.js)
  EMBEDDING_MODEL: z.string().default("Xenova/all-MiniLM-L6-v2"),

  // ─── LLM Gateway ───────────────────────────────────────────────────────────
  LLM_PROVIDER_ORDER: z.string().default("openrouter,mistral,groq"),

  OPENROUTER_API_KEY: z.string().default(""),
  OPENROUTER_MODEL: z.string().default("meta-llama/llama-3.3-70b-instruct:free"),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),

  MISTRAL_API_KEY: z.string().default(""),
  MISTRAL_MODEL: z.string().default("mistral-small-latest"),
  MISTRAL_BASE_URL: z.string().default("https://api.mistral.ai/v1"),

  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GROQ_BASE_URL: z.string().default("https://api.groq.com/openai/v1"),

  // ─── Search (Tavily) ───────────────────────────────────────────────────────
  TAVILY_API_KEY: z.string().default(""),

  // Auth (shared with the Next.js Auth.js app)
  AUTH_SECRET: z.string().default("dev-cognita-shared-secret"),

  FRONTEND_URL: z.string().default("http://localhost:3000"),
})

export const env = envSchema.parse(process.env)

export type ProviderName = "openrouter" | "mistral" | "groq"

/** Ordered list of providers that actually have an API key configured. */
export function configuredProviders(): ProviderName[] {
  const order = env.LLM_PROVIDER_ORDER.split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is ProviderName => ["openrouter", "mistral", "groq"].includes(p))

  const keyFor: Record<ProviderName, string> = {
    openrouter: env.OPENROUTER_API_KEY,
    mistral: env.MISTRAL_API_KEY,
    groq: env.GROQ_API_KEY,
  }

  return order.filter((p) => keyFor[p] && keyFor[p] !== "sk-or-your-key")
}

export function hasTavily(): boolean {
  return env.TAVILY_API_KEY.length > 0
}
