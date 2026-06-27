import crypto from "crypto"
import { cookies } from "next/headers"
import { ensureDb, query } from "./db"

const COOKIE_NAME = "love_journal_session"
const SESSION_DAYS = 14

export class AuthError extends Error {
  constructor(message = "请先登录", status = 401) {
    super(message)
    this.status = status
  }
}

function getSecret() {
  return process.env.AUTH_SECRET || "local-dev-secret-change-me"
}

function base64url(input) {
  return Buffer.from(input).toString("base64url")
}

function sign(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url")
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith("scrypt:")) return false
  const [, salt, hash] = stored.split(":")
  const actual = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, "hex")
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

export function sanitizeUser(user) {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    avatar_url: user.avatar_url || "/avatar.jpg",
    bind_code: user.bind_code,
    created_at: user.created_at,
  }
}

export async function createSession(userId) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  const body = base64url(JSON.stringify({ userId, exp }))
  const token = `${body}.${sign(body)}`
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  })
}

export async function clearSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  })
}

export async function getCurrentUser() {
  const ready = await ensureDb()
  if (!ready) return null

  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  const [body, signature] = token.split(".")
  if (!body || !signature || sign(body) !== signature) return null

  let payload
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  } catch {
    return null
  }

  if (!payload?.userId || !payload?.exp || Date.now() > payload.exp) return null

  const result = await query(
    "SELECT id, username, nickname, avatar_url, bind_code, created_at FROM users WHERE id = $1",
    [payload.userId],
  )
  return result.rows[0] || null
}

export async function getRequiredUser() {
  const user = await getCurrentUser()
  if (!user) throw new AuthError()
  return user
}

export async function generateBindCode() {
  for (let i = 0; i < 10; i += 1) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase()
    const existing = await query("SELECT id FROM users WHERE bind_code = $1", [code])
    if (!existing.rowCount) return code
  }
  throw new Error("生成绑定码失败")
}

export async function getAcceptedPartner(userId) {
  const result = await query(
    `
      SELECT
        cl.id AS link_id,
        cl.requester_id,
        cl.receiver_id,
        partner.id,
        partner.username,
        partner.nickname,
        partner.avatar_url,
        partner.bind_code
      FROM couple_links cl
      JOIN users partner
        ON partner.id = CASE
          WHEN cl.requester_id = $1 THEN cl.receiver_id
          ELSE cl.requester_id
        END
      WHERE cl.status = 'accepted'
        AND (cl.requester_id = $1 OR cl.receiver_id = $1)
      LIMIT 1
    `,
    [userId],
  )
  return result.rows[0] || null
}

export async function getPartnerId(userId) {
  const partner = await getAcceptedPartner(userId)
  return partner?.id || null
}

export function apiError(error, fallback = "请求失败") {
  const status = error?.status || 500
  const message = error?.message || fallback
  if (status >= 500) console.error(error)
  return Response.json({ error: message }, { status })
}

export function normalizeVisibility(value, hasPartner) {
  if (value === "shared" && hasPartner) return "shared"
  return "private"
}
