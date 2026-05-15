import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document as LCDocument } from "@langchain/core/documents"
import { addDocuments } from "./vectorstore"
import { pdfService } from "../services/pdf.service"

export interface IngestParams {
  documentId: string
  userId: string
  filename: string
  mimeType?: string
  buffer: Buffer
}

/**
 * Load → chunk → embed → store a document for RAG.
 * Returns the number of chunks indexed in Qdrant.
 */
export async function ingestDocument(params: IngestParams): Promise<number> {
  const { documentId, userId, filename, mimeType, buffer } = params

  const text =
    mimeType === "application/pdf"
      ? await pdfService.extractText(buffer)
      : buffer.toString("utf-8")

  if (!text.trim()) {
    throw new Error("No extractable text found in the uploaded document.")
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  })
  const chunks = await splitter.splitText(text)

  const docs = chunks.map(
    (content, chunkIndex) =>
      new LCDocument({
        pageContent: content,
        metadata: { userId, documentId, chunkIndex, filename },
      }),
  )

  await addDocuments(docs)
  return docs.length
}
