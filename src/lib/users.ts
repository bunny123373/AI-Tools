// Local, file-backed user store — no database required. Server-only module.
// Users live in `.data/users.json` (gitignored). Passwords are salted+hashed
// with Node's built-in scrypt via timing-safe comparison.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface LocalUser {
  id: string
  name: string
  email: string
  passwordHash?: string
  createdAt: string
}

interface UserFile {
  users: LocalUser[]
}

const DATA_DIR = join(process.cwd(), '.data')
const USERS_FILE = join(DATA_DIR, 'users.json')

let cache: UserFile | null = null

function load(): UserFile {
  if (cache) return cache
  if (existsSync(USERS_FILE)) {
    try {
      cache = JSON.parse(readFileSync(USERS_FILE, 'utf8')) as UserFile
    } catch {
      cache = { users: [] }
    }
  } else {
    cache = { users: [] }
  }
  return cache
}

function save(file: UserFile): void {
  cache = file
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(USERS_FILE, JSON.stringify(file, null, 2), 'utf8')
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(user: LocalUser, password: string): boolean {
  if (!user.passwordHash) return false
  const [salt, hash] = user.passwordHash.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const stored = Buffer.from(hash, 'hex')
  return candidate.length === stored.length && timingSafeEqual(candidate, stored)
}

export function findUserByEmail(email: string): LocalUser | undefined {
  const normalized = email.trim().toLowerCase()
  return load().users.find((u) => u.email === normalized)
}

export function createUser(opts: { name: string; email: string; password: string }): LocalUser {
  const file = load()
  const email = opts.email.trim().toLowerCase()
  if (file.users.some((u) => u.email === email)) {
    throw new Error('EMAIL_TAKEN')
  }
  const user: LocalUser = {
    id: `usr_${randomBytes(6).toString('hex')}`,
    name: opts.name.trim() || email.split('@')[0],
    email,
    passwordHash: hashPassword(opts.password),
    createdAt: new Date().toISOString(),
  }
  file.users.push(user)
  save(file)
  return user
}

export function verifyCredentials(email: string, password: string): LocalUser | null {
  const user = findUserByEmail(email)
  if (!user || !verifyPassword(user, password)) return null
  return user
}