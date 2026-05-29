import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public routes that never require authentication.
const PUBLIC_PATHS = ["/", "/login", "/register"]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith("/api/auth")) return true
  if (pathname.startsWith("/api/register")) return true
  return false
}

/**
 * Lightweight, edge-safe auth gate. With the JWT session strategy, Auth.js stores
 * the session in a cookie; we just check for its presence here (no DB / no adapter
 * imports, so this stays edge-compatible). Full verification happens server-side in
 * pages via `auth()`.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token")

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static, _next/image, favicon
     * - static asset files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
