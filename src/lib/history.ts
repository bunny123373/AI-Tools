// Local, file-backed chat history store — no database required. Server-only.
// Conversations live in `.data/chats.json` (gitignored), scoped per user id.
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ChatMessage } from '@/types'

export interface HistoryChat {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface HistorySummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  count: number
}

interface HistoryFile {
  chats: HistoryChat[]
}

const DATA_DIR = join(process.cwd(), '.data')
const CHATS_FILE = join(DATA_DIR, 'chats.json')

let cache: HistoryFile | null = null

function load(): HistoryFile {
  if (cache) return cache
  if (existsSync(CHATS_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(CHATS_FILE, 'utf8')) as HistoryFile
      cache = Array.isArray(parsed?.chats) ? parsed : { chats: [] }
    } catch {
      cache = { chats: [] }
    }
  } else {
    cache = { chats: [] }
  }
  return cache
}

function save(file: HistoryFile): void {
  cache = file
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(CHATS_FILE, JSON.stringify(file, null, 2), 'utf8')
}

function sanitizeTitle(title: string): string {
  const t = title.trim().replace(/\s+/g, ' ').slice(0, 60)
  return t || 'New chat'
}

function toSummary(c: HistoryChat): HistorySummary {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    count: c.messages.length,
  }
}

export function listChatsForUser(userId: string): HistorySummary[] {
  return load()
    .chats.filter((c) => c.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map(toSummary)
}

export function getChatForUser(userId: string, id: string): HistoryChat | undefined {
  return load().chats.find((c) => c.id === id && c.userId === userId)
}

export function createChatForUser(
  userId: string,
  opts: { title?: string; messages?: ChatMessage[] },
): HistoryChat {
  const file = load()
  const messages = Array.isArray(opts.messages) ? opts.messages : []
  const now = new Date().toISOString()
  const chat: HistoryChat = {
    id: `chat_${randomBytes(6).toString('hex')}`,
    userId,
    title: sanitizeTitle(opts.title ?? messages[0]?.content ?? 'New chat'),
    messages,
    createdAt: now,
    updatedAt: now,
  }
  file.chats.push(chat)
  save(file)
  return chat
}

/** Create-or-update a conversation that belongs to `userId`. Returns the stored chat. */
export function saveChatForUser(
  userId: string,
  chat: { id: string; title?: string; messages: ChatMessage[]; createdAt?: string },
): HistoryChat {
  const file = load()
  const messages = Array.isArray(chat.messages) ? chat.messages : []
  const now = new Date().toISOString()
  const next: HistoryChat = {
    id: chat.id,
    userId,
    title: sanitizeTitle(chat.title ?? messages[0]?.content ?? 'New chat'),
    messages,
    createdAt: chat.createdAt || now,
    updatedAt: now,
  }
  const idx = file.chats.findIndex((c) => c.id === next.id && c.userId === userId)
  if (idx === -1) file.chats.push(next)
  else file.chats[idx] = next
  save(file)
  return next
}

export function deleteChatForUser(userId: string, id: string): boolean {
  const file = load()
  const before = file.chats.length
  file.chats = file.chats.filter((c) => !(c.id === id && c.userId === userId))
  if (file.chats.length === before) return false
  save(file)
  return true
}