import { pdf } from "@react-pdf/renderer"
import React from "react"
import { AssessmentPDF } from "@/components/assessment/AssessmentPDF"

export async function exportToPDF(
  assessmentId: string,
  includeAnswers: boolean = false,
  token?: string,
) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  const res = await fetch(
    `${apiUrl}/api/assessments/${assessmentId}?includeAnswers=${includeAnswers}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    },
  )
  if (!res.ok) throw new Error("Failed to load assessment for PDF export")
  const assessment = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(AssessmentPDF, { assessment, includeAnswers }) as any
  const blob = await pdf(element).toBlob()
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  const suffix = includeAnswers ? "_teacher_key" : "_question_paper"
  a.download = `${assessment.title.replace(/\s+/g, "_")}${suffix}.pdf`
  a.click()

  URL.revokeObjectURL(url)
}
