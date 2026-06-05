"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { createApi } from "@/lib/api"

/**
 * Client hook returning a typed API client bound to the current session's apiToken.
 * The token is the short-lived HS256 JWT minted in the Auth.js session callback,
 * which the Express API verifies with the shared AUTH_SECRET.
 */
export function useApi() {
  const { data: session } = useSession()
  const token = session?.apiToken
  return useMemo(() => createApi(token), [token])
}

export function useApiToken(): string | undefined {
  const { data: session } = useSession()
  return session?.apiToken
}
