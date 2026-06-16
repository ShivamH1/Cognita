import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings"
import { FlagEmbedding, EmbeddingModel } from "fastembed"

/**
 * Local embeddings via fastembed (onnxruntime) — no external API, so no embedding
 * rate limits or cost, and no native `sharp` dependency. Model: all-MiniLM-L6-v2 (384-dim).
 *
 * The ONNX model (~90 MB) downloads to a local cache on first use; call `warmup()`
 * on worker boot to pay that cost up front.
 */
export const EMBEDDING_DIM = 384

let modelPromise: Promise<FlagEmbedding> | null = null

function getModel(): Promise<FlagEmbedding> {
  if (!modelPromise) {
    modelPromise = FlagEmbedding.init({ model: EmbeddingModel.AllMiniLML6V2, maxLength: 512 })
  }
  return modelPromise
}

function toArray(v: number[] | Float32Array): number[] {
  return Array.isArray(v) ? v : Array.from(v)
}

export class LocalEmbeddings extends Embeddings {
  constructor(params: EmbeddingsParams = {}) {
    super(params)
  }

  async embedQuery(text: string): Promise<number[]> {
    const model = await getModel()
    const vec = await model.queryEmbed(text)
    return toArray(vec)
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const model = await getModel()
    const out: number[][] = []
    for await (const batch of model.embed(texts, 32)) {
      for (const vec of batch) out.push(toArray(vec))
    }
    return out
  }
}

export const embeddings = new LocalEmbeddings()

export async function warmup(): Promise<void> {
  const model = await getModel()
  // Run a tiny embed so the ONNX session is fully initialised.
  await model.queryEmbed("warmup")
}
