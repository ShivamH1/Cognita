import { QdrantVectorStore } from "@langchain/qdrant"
import { QdrantClient } from "@qdrant/js-client-rest"
import type { Document as LCDocument } from "@langchain/core/documents"
import { embeddings, EMBEDDING_DIM } from "./embeddings"
import { env } from "../lib/env"

/** All document chunks live in one collection, partitioned by metadata.documentId. */
export const COLLECTION = "cognita_documents"

export const qdrant = new QdrantClient({ url: env.QDRANT_URL, checkCompatibility: false })

let ensured = false
export async function ensureCollection(): Promise<void> {
  if (ensured) return
  const { collections } = await qdrant.getCollections()
  if (!collections.some((c) => c.name === COLLECTION)) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
    })
    // Index the partition key so filtered search/delete is fast.
    await qdrant
      .createPayloadIndex(COLLECTION, { field_name: "metadata.documentId", field_schema: "keyword" })
      .catch(() => undefined)
  }
  ensured = true
}

export async function getVectorStore(): Promise<QdrantVectorStore> {
  await ensureCollection()
  return new QdrantVectorStore(embeddings, { client: qdrant, collectionName: COLLECTION })
}

export async function addDocuments(docs: LCDocument[]): Promise<void> {
  const store = await getVectorStore()
  await store.addDocuments(docs)
}

/** Qdrant filter restricting search to a single document's chunks. */
export function documentFilter(documentId: string) {
  return { must: [{ key: "metadata.documentId", match: { value: documentId } }] }
}

export async function similaritySearch(documentId: string, query: string, k = 5): Promise<LCDocument[]> {
  const store = await getVectorStore()
  return store.similaritySearch(query, k, documentFilter(documentId))
}

export async function deleteDocumentVectors(documentId: string): Promise<void> {
  await ensureCollection()
  await qdrant.delete(COLLECTION, { filter: documentFilter(documentId), wait: true }).catch(() => undefined)
}
