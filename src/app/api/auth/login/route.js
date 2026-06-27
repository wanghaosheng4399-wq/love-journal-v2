import { createSession, sanitizeUser, verifyPassword, apiError } from "../../../../lib/auth"
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
    const result = await query("SELECT * FROM users WHERE username = $1", [username])
    const user = result.rows[0]

    if (!user || !verifyPassword(password, user.password_hash)) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 })
    }

    await createSession(user.id)
    return Response.json({ user: sanitizeUser(user) })
  } catch (error) {
    return apiError(error, "登录失败")
  }
}
