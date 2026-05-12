import { PrismaClient } from "@prisma/client"

// Singleton PrismaClient (avoids exhausting connections under tsx watch reloads).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect()
    console.log("Connected to Postgres (Prisma) successfully")
  } catch (error) {
    console.error("Postgres connection error:", error)
    process.exit(1)
  }
}
