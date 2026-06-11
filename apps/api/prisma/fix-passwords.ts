import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "../.env") })

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash("password123", 10)
  const result = await prisma.user.updateMany({
    where: { passwordHash: null },
    data: { passwordHash: hash },
  })
  console.log(`Updated ${result.count} users with passwordHash`)
}

main().finally(() => prisma.$disconnect())
