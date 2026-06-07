// Usage: node scripts/set-admin.mjs <email>
// Example: node scripts/set-admin.mjs you@example.com
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map((v, i) => i === 0 ? v.trim() : l.slice(l.indexOf('=') + 1).trim()))
)

const email = process.argv[2]
if (!email) { console.error('Usage: node scripts/set-admin.mjs <email>'); process.exit(1) }

const client = new MongoClient(env.MONGODB_URI)
await client.connect()
const db = client.db()
const result = await db.collection('users').updateOne({ email }, { $set: { role: 'admin' } })
if (result.matchedCount === 0) {
  console.error(`No user found with email: ${email}`)
} else {
  console.log(`✓ Set role=admin for ${email}`)
}
await client.close()
