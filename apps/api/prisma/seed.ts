import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "../.env") })

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const SECTIONS_CONFIG = [
  { name: "A", questionType: "mcq", questionCount: 5, marksPerQuestion: 2, instructions: "Attempt all questions", difficultyMix: { easy: 60, medium: 40, hard: 0 } },
  { name: "B", questionType: "short_answer", questionCount: 2, marksPerQuestion: 5, instructions: "Answer in 2–4 sentences", difficultyMix: { easy: 0, medium: 50, hard: 50 } },
]

const ASSESSMENT_SECTIONS = [
  {
    name: "Section A",
    questionType: "mcq",
    instructions: "Choose the best answer for each question. Each question carries 2 marks.",
    totalMarks: 10,
    questions: [
      {
        id: "A1", number: 1,
        text: "Which organelle is primarily responsible for photosynthesis in plant cells?",
        type: "mcq", difficulty: "easy", marks: 2,
        options: [{ label: "A", text: "Mitochondria" }, { label: "B", text: "Chloroplast" }, { label: "C", text: "Nucleus" }, { label: "D", text: "Ribosome" }],
        answer: "B",
      },
      {
        id: "A2", number: 2,
        text: "What is the primary pigment responsible for capturing light energy in photosynthesis?",
        type: "mcq", difficulty: "easy", marks: 2,
        options: [{ label: "A", text: "Carotenoid" }, { label: "B", text: "Anthocyanin" }, { label: "C", text: "Chlorophyll" }, { label: "D", text: "Xanthophyll" }],
        answer: "C",
      },
      {
        id: "A3", number: 3,
        text: "Which of the following is NOT a product of the light-dependent reactions of photosynthesis?",
        type: "mcq", difficulty: "medium", marks: 2,
        options: [{ label: "A", text: "ATP" }, { label: "B", text: "NADPH" }, { label: "C", text: "Glucose" }, { label: "D", text: "Oxygen" }],
        answer: "C",
      },
      {
        id: "A4", number: 4,
        text: "The Calvin cycle takes place in which part of the chloroplast?",
        type: "mcq", difficulty: "medium", marks: 2,
        options: [{ label: "A", text: "Thylakoid membrane" }, { label: "B", text: "Outer membrane" }, { label: "C", text: "Stroma" }, { label: "D", text: "Intermembrane space" }],
        answer: "C",
      },
      {
        id: "A5", number: 5,
        text: "Which gas is absorbed by plants during photosynthesis?",
        type: "mcq", difficulty: "easy", marks: 2,
        options: [{ label: "A", text: "Oxygen" }, { label: "B", text: "Nitrogen" }, { label: "C", text: "Carbon Dioxide" }, { label: "D", text: "Hydrogen" }],
        answer: "C",
      },
    ],
  },
  {
    name: "Section B",
    questionType: "short_answer",
    instructions: "Answer in 2–4 sentences. Each question carries 5 marks.",
    totalMarks: 10,
    questions: [
      {
        id: "B1", number: 1,
        text: "Briefly explain the two main stages of photosynthesis and where each occurs within the chloroplast.",
        type: "short_answer", difficulty: "medium", marks: 5,
        answer: "The two main stages are the light-dependent reactions (thylakoid membranes) and the Calvin cycle (stroma). In the light reactions, light energy is used to produce ATP and NADPH, and water is split to release oxygen. In the Calvin cycle, CO₂ is fixed using ATP and NADPH to produce glucose.",
      },
      {
        id: "B2", number: 2,
        text: "What is the significance of the electron transport chain in the light-dependent reactions of photosynthesis?",
        type: "short_answer", difficulty: "hard", marks: 5,
        answer: "The electron transport chain transfers high-energy electrons through thylakoid membrane proteins, pumping H⁺ ions to create a proton gradient that drives ATP synthase. It also reduces NADP⁺ to NADPH, which is essential for the Calvin cycle.",
      },
    ],
  },
]

const STUDENT_ANSWERS = {
  A1: "B",
  A2: "C",
  A3: "A", // wrong (correct: C)
  A4: "C",
  A5: "C",
  B1: "Photosynthesis has two main stages. The light-dependent reactions happen in the thylakoid membranes where light is captured to produce ATP and NADPH. The Calvin cycle in the stroma uses these to fix CO2 into glucose.",
  B2: "The electron transport chain moves electrons through protein complexes in the thylakoid membrane, using the energy to pump protons and create a gradient that drives ATP synthase to produce ATP.",
}

async function main() {
  const hash = await bcrypt.hash("password123", 10)

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@cognita.test" },
    update: {},
    create: { name: "Dr. Sarah Chen", email: "teacher@cognita.test", passwordHash: hash, role: "TEACHER" },
  })

  const alice = await prisma.user.upsert({
    where: { email: "alice@cognita.test" },
    update: {},
    create: { name: "Alice Johnson", email: "alice@cognita.test", passwordHash: hash, role: "STUDENT" },
  })

  await prisma.user.upsert({
    where: { email: "bob@cognita.test" },
    update: {},
    create: { name: "Bob Martinez", email: "bob@cognita.test", passwordHash: hash, role: "STUDENT" },
  })

  console.log("✓ Users created")

  // Skip if this specific demo assessment is already seeded
  const exists = await prisma.assignment.findFirst({
    where: { ownerId: teacher.id, title: "Biology Semester Assessment — Photosynthesis" },
  })
  if (exists) {
    console.log("✓ Seed data already exists — skipping assessment creation")
    printCredentials()
    return
  }

  const assignment = await prisma.assignment.create({
    data: {
      ownerId: teacher.id,
      createdByRole: "TEACHER",
      title: "Biology Semester Assessment — Photosynthesis",
      subject: "Biology",
      topic: "Photosynthesis",
      gradeLevel: "Grade 10",
      dueDate: "2026-07-01T00:00:00.000Z",
      totalMarks: 20,
      additionalInstructions: "All the best! Read each question carefully before answering.",
      sections: SECTIONS_CONFIG,
      status: "COMPLETE",
    },
  })

  const assessment = await prisma.assessment.create({
    data: {
      assignmentId: assignment.id,
      title: "Biology Semester Assessment — Photosynthesis",
      subject: "Biology",
      topic: "Photosynthesis",
      gradeLevel: "Grade 10",
      dueDate: "2026-07-01",
      totalMarks: 20,
      duration: "1 hour",
      generalInstructions: [
        "Attempt all sections.",
        "Write your name and roll number on the answer sheet.",
        "Read all questions carefully before answering.",
        "Scientific calculators are not permitted.",
      ],
      sections: ASSESSMENT_SECTIONS,
      status: "COMPLETE",
      generatedAt: new Date().toISOString(),
    },
  })

  console.log("✓ Assessment created:", assessment.id)

  // Alice's graded submission
  const submission = await prisma.submission.create({
    data: {
      assessmentId: assessment.id,
      studentId: alice.id,
      answers: STUDENT_ANSWERS,
      totalScore: 16,
      maxScore: 20,
      status: "graded",
    },
  })

  await prisma.grade.createMany({
    data: [
      { submissionId: submission.id, questionId: "A1", score: 2, maxScore: 2, correct: true, feedback: "Correct! Chloroplasts are the organelles responsible for photosynthesis." },
      { submissionId: submission.id, questionId: "A2", score: 2, maxScore: 2, correct: true, feedback: "Correct! Chlorophyll is the primary photosynthetic pigment." },
      { submissionId: submission.id, questionId: "A3", score: 0, maxScore: 2, correct: false, feedback: "Incorrect. Glucose is produced in the Calvin cycle, not the light-dependent reactions. Light reactions produce ATP, NADPH, and O₂." },
      { submissionId: submission.id, questionId: "A4", score: 2, maxScore: 2, correct: true, feedback: "Correct! The Calvin cycle (light-independent reactions) occurs in the stroma." },
      { submissionId: submission.id, questionId: "A5", score: 2, maxScore: 2, correct: true, feedback: "Correct! Plants absorb CO₂ during photosynthesis." },
      { submissionId: submission.id, questionId: "B1", score: 4, maxScore: 5, feedback: "Good answer! You correctly identified both stages and their locations. For full marks, also mention that water is split during light reactions releasing oxygen as a byproduct." },
      { submissionId: submission.id, questionId: "B2", score: 4, maxScore: 5, feedback: "Good explanation of the proton gradient and ATP synthesis. For full marks, also mention that NADP⁺ is reduced to NADPH at the end of the chain." },
    ],
  })

  console.log("✓ Submission + grades seeded (Alice: 16/20)")
  printCredentials()
}

function printCredentials() {
  console.log("\n─────────────────────────────────────────────")
  console.log("  Teacher:  teacher@cognita.test / password123")
  console.log("  Student:  alice@cognita.test   / password123")
  console.log("  Student:  bob@cognita.test     / password123")
  console.log("─────────────────────────────────────────────")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
