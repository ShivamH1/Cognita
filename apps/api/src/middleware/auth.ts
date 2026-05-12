import type { Request, Response, NextFunction } from "express"
import { jwtVerify } from "jose"
import { env } from "../lib/env"

export interface AuthUser {
  id: string
  email: string
  role: "STUDENT" | "TEACHER"
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

const secret = new TextEncoder().encode(env.AUTH_SECRET)

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith("Bearer ")) return header.slice(7)
  return null
}

/**
 * Verify the HS256 JWT minted by the Next.js Auth.js app (signed with the shared
 * AUTH_SECRET). Populates req.user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(req)
  if (!token) {
    res.status(401).json({ error: "Authentication required" })
    return
  }
  try {
    const { payload } = await jwtVerify(token, secret)
    req.user = {
      id: String(payload.sub),
      email: String(payload.email ?? ""),
      role: (payload.role === "TEACHER" ? "TEACHER" : "STUDENT"),
    }
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}

export function requireRole(role: "STUDENT" | "TEACHER") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" })
      return
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: `Requires ${role} role` })
      return
    }
    next()
  }
}

/** Optional auth: populate req.user if a valid token is present, but don't reject. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(req)
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret)
      req.user = {
        id: String(payload.sub),
        email: String(payload.email ?? ""),
        role: payload.role === "TEACHER" ? "TEACHER" : "STUDENT",
      }
    } catch {
      /* ignore */
    }
  }
  next()
}
