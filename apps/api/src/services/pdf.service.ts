import pdfParse from "pdf-parse"

class PDFService {
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer)
      return data.text || ""
    } catch (error: any) {
      console.error("Error extracting text from PDF:", error.message)
      throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }
  }
}

export const pdfService = new PDFService()
