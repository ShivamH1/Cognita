import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"
import { prisma } from "@/lib/prisma"

type Role = "STUDENT" | "TEACHER"

async function mintApiToken(uid: string, email: string, role: Role): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET)
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(uid)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (typeof email !== "string" || typeof password !== "string") return null

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        })
        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string
        token.role = (user as { role: Role }).role
      }
      return token
    },
    async session({ session, token }) {
      const uid = token.uid as string
      const role = token.role as Role
      if (session.user) {
        session.user.id = uid
        session.user.role = role
      }
      session.apiToken = await mintApiToken(uid, session.user?.email ?? "", role)
      return session
    },
  },
})
