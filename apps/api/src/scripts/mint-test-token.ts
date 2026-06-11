import { SignJWT } from "jose"
import { prisma } from "../lib/db"
import { env } from "../lib/env"

// Seeds a test student + teacher and prints Bearer tokens for smoke-testing the API.
async function main() {
  const role = (process.argv[2] as "STUDENT" | "TEACHER") ?? "STUDENT"
  const email = role === "TEACHER" ? "teacher@cognita.test" : "student@cognita.test"

  const user = await prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, name: role === "TEACHER" ? "Test Teacher" : "Test Student", role },
  })

  const secret = new TextEncoder().encode(env.AUTH_SECRET)
  const token = await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)

  console.log(JSON.stringify({ userId: user.id, role: user.role, token }))
  await prisma.$disconnect()
}

main()
