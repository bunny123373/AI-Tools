/* Print the current Puter allowance state + biggest monthly costs. */
const { readFileSync } = require('node:fs')
const { init } = require('@heyputer/puter.js/src/init.cjs')

const env = readFileSync('D:/ai-toolbox/.env.local', 'utf8')
const m = env.match(/^\s*PUTER_AUTH_TOKEN=(.+)$/m)
const token = m ? m[1].trim() : ''

async function main() {
  const puter = init(token)
  await new Promise((r) => setTimeout(r, 400))
  try {
    const u = await Promise.race([puter.auth.getMonthlyUsage(), new Promise((r) => setTimeout(() => r('__T__'), 20000))])
    if (u === '__T__') return console.log('TIMEOUT')
    console.log('allowanceInfo:', JSON.stringify(u.allowanceInfo, null, 1))
    const usage = u.usage || {}
    const rows = Object.entries(usage).map(([k, v]) => ({ k, ...(v || {}) }))
    rows.sort((a, b) => (b.cost || 0) - (a.cost || 0))
    console.log('\ntop monthly costs (units, 1000 = $1):')
    for (const r of rows.slice(0, 12)) {
      console.log(`  ${String(r.cost).padStart(8)}  ${String(r.k).slice(0, 70)}`)
    }
    const total = rows.reduce((s, r) => s + (r.cost || 0), 0)
    console.log(`\ntotal spent ≈ $${(total / 1000).toFixed(2)}`)
  } catch (e) {
    console.log('ERR:', JSON.stringify(e, Object.getOwnPropertyNames(e || {}), 1).slice(0, 300))
  }
}
main()