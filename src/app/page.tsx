'use client'

// The whole app is a client-side, localStorage-based single-page tool (same as
// the original Vite build). We wait for the browser to mount before rendering
// anything so window/localStorage accesses only ever run on the client.
import { useEffect, useState } from 'react'
import App from '../App'

export default function Page() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <App />
}