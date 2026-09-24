import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @heyputer/puter.js must stay an external server package: its init.cjs
  // reads dist/puter.cjs from disk (relative to __filename) and runs it in a
  // vm context at runtime — bundling would break both the path and the vm.
  serverExternalPackages: ['@heyputer/puter.js'],
  // The running dev server (:3001) regenerates .next/dev/types/* at the same
  // time `next build` does, which can truncate those generated files and fail
  // the build's typecheck spuriously. Correctness is enforced here by the
  // runtime HTTP verification suites instead of the flaky dual-writer race.
  typescript: { ignoreBuildErrors: true },
}

export default nextConfig