#!/usr/bin/env node
/* ---------------------------------------------------------------------------
 * One-time Puter token mint for the AI Toolbox server.
 *
 * Opens your browser to puter.com — sign in (or create a free Puter account)
 * and approve the app, and the token is captured automatically.
 *
 * Usage:
 *   npm run puter-token            # print token, you paste it yourself
 *   npm run puter-token -- --write # write PUTER_AUTH_TOKEN into .env.local
 * ------------------------------------------------------------------------- */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const writeFlag = process.argv.includes('--write')
const envPath = resolve(root, '.env.local')

const mod = await import('@heyputer/puter.js/src/init.cjs')
const getAuthToken = mod.getAuthToken ?? mod.default?.getAuthToken
const initPuter = mod.init ?? mod.default?.init

if (typeof getAuthToken !== 'function' || typeof initPuter !== 'function') {
  console.error('Could not load the Puter SDK. Run `npm install @heyputer/puter.js` first.')
  process.exit(1)
}

console.log('Opening your browser to puter.com — sign in (or create a free account) and approve the app.')
console.log('Waiting for you to authorize (keep this terminal open)…')

const token = await getAuthToken()
if (!token) {
  console.error('\nNo token received — did you close the browser tab before authorizing? Try again.')
  process.exit(1)
}

// Validate the token is a real API token BEFORE writing it anywhere.
// Pasting a token copied from puter.com's own site (devtools/localStorage)
// will NOT authenticate against api.puter.com (401 / token_auth_failed).
console.log('Validating token against puter.com…')
const puter = initPuter(token)
await new Promise((r) => setTimeout(r, 400))
let valid = false
try {
  const user = await puter.auth.getUser()
  valid = !!(user && !user.error && (user.username || user.id || user.name))
} catch {
  valid = false
}
if (!valid) {
  console.error(
    '\n✗ Puter rejected this token (401 Unauthorized).\n' +
      'The API token must come from the puter.com sign-in popup itself.\n' +
      'Try again and make sure you approve in the popup (allow popups if blocked).',
  )
  process.exit(1)
}
console.log('✓ Token validated — it authenticates against api.puter.com.')

if (writeFlag) {
  let env = ''
  if (existsSync(envPath)) env = readFileSync(envPath, 'utf8')
  const lines = env.split(/\r?\n/)
  const out = lines.filter((l) => !/^\s*PUTER_AUTH_TOKEN\s*=/.test(l))
  out.push(`PUTER_AUTH_TOKEN=${token}`)
  writeFileSync(envPath, out.join('\n').trimEnd() + '\n')
  console.log('\n✓ PUTER_AUTH_TOKEN written to ' + envPath)
  console.log('\nNext: restart the server (npm run dev, or build + start), then pick the\n"Puter (free, 1000+ models)" provider and chat / generate images for free.')
} else {
  console.log('\nYour Puter token:\n')
  console.log(token)
  console.log('\nAdd it to .env.local as:')
  console.log(`PUTER_AUTH_TOKEN=${token}`)
  console.log('\n…or re-run with  npm run puter-token -- --write  to do it automatically.')
}