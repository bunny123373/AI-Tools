'use client'

import type { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'

// Thin client wrapper so useSession()/signIn()/signOut() work anywhere in the tree.
export default function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}