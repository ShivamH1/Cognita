import type { DefaultSession } from "next-auth"

type Role = "STUDENT" | "TEACHER"

declare module "next-auth" {
  interface Session {
    apiToken: string
    user: {
      id: string
      role: Role
    } & DefaultSession["user"]
  }

  interface User {
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string
    role: Role
  }
}
