import { createSession, generateBindCode, hashPassword, sanitizeUser, apiError } from "../../../../lib/auth"
import { ensureDb, query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const body = await request.json()
    const username = String(body.username || "").trim()
    const password = String(body.password || "")
    const nickname = String(body.nickname || username).trim()
    const inviteCode = String(body.inviteCode || "").trim()
    const expectedInvite = process.env.REGISTER_INVITE_CODE || "0728"

    if (inviteCode !== expectedInvite) return Response.json({ error: "邀请码错误" }, { status: 400 })
    if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{2,50}$/.test(username)) {
      return Response.json({ error: "用户名需要 2-50 个字符" }, { status: 400 })
    }
    if (password.length < 6) return Response.json({ error: "密码至少 6 位" }, { status: 400 })

    const existing = await query("SELECT id FROM users WHERE username = $1", [username])
    if (existing.rowCount) return Response.json({ error: "用户名已存在" }, { status: 409 })

    const bindCode = await generateBindCode()
    const result = await query(
      `INSERT INTO users (username, password_hash, nickname, avatar_url, bind_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, nickname, avatar_url, bind_code, created_at`,
      [username, hashPassword(password), nickname || username, "/avatar.jpg", bindCode],
    )

    await createSession(result.rows[0].id)
    return Response.json({ user: sanitizeUser(result.rows[0]) }, { status: 201 })
  } catch (error) {
    return apiError(error, "注册失败")
  }
}
