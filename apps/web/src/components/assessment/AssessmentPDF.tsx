import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { GeneratedAssessment } from "@/types"

interface AssessmentPDFProps {
  assessment: GeneratedAssessment
  includeAnswers?: boolean
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.6,
    color: "#1e293b"
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    paddingBottom: 12,
    marginBottom: 15,
    textAlign: "center"
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 4,
    color: "#0f172a"
  },
  subtitle: {
    fontSize: 10,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6
  },
  metaItem: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#475569"
  },
  studentInfo: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 10,
    marginVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  studentField: {
    flexDirection: "row",
    alignItems: "center"
  },
  studentLabel: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#475569"
  },
  studentLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#64748b",
    borderBottomStyle: "dashed",
    width: 100,
    marginLeft: 4,
    height: 12
  },
  instructions: {
    backgroundColor: "#fafaf9",
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 4,
    padding: 8,
    marginBottom: 12
  },
  instructionsTitle: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 3,
    textTransform: "uppercase"
  },
  instructionItem: {
    fontSize: 8,
    color: "#44403c",
    marginBottom: 2
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 4,
    marginTop: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  sectionName: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#0f172a"
  },
  sectionMeta: {
    fontSize: 8,
    color: "#64748b"
  },
  questionRow: {
    flexDirection: "row",
    marginVertical: 6,
    paddingBottom: 4
  },
  questionNum: {
    width: 22,
    fontWeight: "bold",
    fontSize: 9.5,
    color: "#475569"
  },
  questionBody: {
    flex: 1
  },
  questionText: {
    fontSize: 9.5,
    color: "#0f172a",
    fontWeight: "medium"
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4
  },
  optionCol: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 4,
    paddingRight: 10
  },
  optionLabel: {
    fontWeight: "bold",
    fontSize: 9,
    width: 14,
    color: "#64748b"
  },
  optionText: {
    fontSize: 9,
    color: "#334155"
  },
  dashedLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "dashed",
    height: 15,
    marginTop: 3,
    width: "90%"
  },
  answerBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 4,
    padding: 6,
    marginTop: 6,
    paddingLeft: 8
  },
  answerTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#166534",
    textTransform: "uppercase",
    marginBottom: 2
  },
  answerText: {
    fontSize: 9,
    color: "#14532d"
  },
  questionMeta: {
    width: 70,
    alignItems: "flex-end",
    fontSize: 8,
    color: "#64748b"
  },
  sectionMarks: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569"
  },
  longAnswerLines: {
    marginTop: 6,
    gap: 8
  }
})

export function AssessmentPDF({ assessment, includeAnswers = false }: AssessmentPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header Block */}
        <View style={styles.header}>
          <Text style={styles.title}>{assessment.title}</Text>
          <Text style={styles.subtitle}>{assessment.subject} — {assessment.topic}</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>GRADE: {assessment.gradeLevel}</Text>
            {assessment.duration && <Text style={styles.metaItem}>DURATION: {assessment.duration}</Text>}
            <Text style={styles.metaItem}>TOTAL MARKS: {assessment.totalMarks}</Text>
          </View>
        </View>

        {/* General Instructions */}
        {assessment.generalInstructions && assessment.generalInstructions.length > 0 && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>General Instructions:</Text>
            {assessment.generalInstructions.map((inst, i) => (
              <Text key={i} style={styles.instructionItem}>
                {i + 1}. {inst}
              </Text>
            ))}
          </View>
        )}

        {/* Candidate Info Fields */}
        <View style={styles.studentInfo}>
          <View style={styles.studentField}>
            <Text style={styles.studentLabel}>Candidate Name:</Text>
            <View style={styles.studentLine} />
          </View>
          <View style={styles.studentField}>
            <Text style={styles.studentLabel}>Roll Number:</Text>
            <View style={styles.studentLine} />
          </View>
          <View style={styles.studentField}>
            <Text style={styles.studentLabel}>Section:</Text>
            <View style={styles.studentLine} />
          </View>
        </View>

        {/* Section mappings */}
        {assessment.sections.map((section) => (
          <View key={section.name} wrap={true}>
            
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionName}>{section.name}</Text>
                <Text style={styles.sectionMeta}>
                  {section.questionType.replace("_", " ").toUpperCase()} • {section.instructions}
                </Text>
              </View>
              <Text style={styles.sectionMarks}>Weight: {section.totalMarks} Marks</Text>
            </View>

            {/* Questions lists */}
            {section.questions.map((q) => (
              <View key={q.id} style={styles.questionRow} wrap={false}>
                
                {/* Number */}
                <Text style={styles.questionNum}>Q{q.number}.</Text>
                
                {/* Content body */}
                <View style={styles.questionBody}>
                  <Text style={styles.questionText}>{q.text}</Text>

                  {/* MCQ Options */}
                  {q.type === "mcq" && q.options && (
                    <View style={styles.optionGrid}>
                      {q.options.map((opt) => {
                        const isAnswer = includeAnswers && q.answer === opt.label
                        return (
                          <View key={opt.label} style={styles.optionCol}>
                            <Text style={[styles.optionLabel, isAnswer ? { color: "#166534", fontWeight: "bold" } : {}]}>
                              {opt.label}.
                            </Text>
                            <Text style={[styles.optionText, isAnswer ? { color: "#14532d", fontWeight: "bold" } : {}]}>
                              {opt.text}
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                  )}

                  {/* True False Options */}
                  {q.type === "true_false" && (
                    <View style={styles.optionGrid}>
                      {["True", "False"].map((val, idx) => {
                        const label = idx === 0 ? "A" : "B"
                        const isAnswer = includeAnswers && q.answer === label
                        return (
                          <View key={val} style={styles.optionCol}>
                            <Text style={[styles.optionLabel, isAnswer ? { color: "#166534", fontWeight: "bold" } : {}]}>
                              {label}.
                            </Text>
                            <Text style={[styles.optionText, isAnswer ? { color: "#14532d", fontWeight: "bold" } : {}]}>
                              {val}
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                  )}

                  {/* Lines for short/fill blank */}
                  {(q.type === "short_answer" || q.type === "fill_blank") && !includeAnswers && (
                    <View style={styles.dashedLine} />
                  )}

                  {/* Lines for essay response */}
                  {q.type === "long_answer" && !includeAnswers && (
                    <View style={styles.longAnswerLines}>
                      <View style={styles.dashedLine} />
                      <View style={styles.dashedLine} />
                      <View style={styles.dashedLine} />
                      <View style={styles.dashedLine} />
                    </View>
                  )}

                  {/* Teacher answers display block */}
                  {includeAnswers && q.answer && (
                    <View style={styles.answerBox}>
                      <Text style={styles.answerTitle}>Model Answer / Key:</Text>
                      <Text style={styles.answerText}>{q.answer}</Text>
                    </View>
                  )}
                </View>

                {/* Right weights column */}
                <View style={styles.questionMeta}>
                  <Text>[{q.marks} Mark{q.marks !== 1 ? "s" : ""}]</Text>
                  <Text style={{ fontSize: 7, color: "#94a3b8", marginTop: 2 }}>{q.difficulty.toUpperCase()}</Text>
                </View>

              </View>
            ))}

          </View>
        ))}

      </Page>
    </Document>
  )
}
