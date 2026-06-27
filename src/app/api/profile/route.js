import { apiError, getRequiredUser, sanitizeUser } from "../../../lib/auth"
import { query } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getRequiredUser()
    return Response.json(sanitizeUser(user))
  } catch (error) {
    return apiError(error, "读取个人资料失败")
  }
}

export async function PUT(request) {
  try {
    const user = await getRequiredUser()
    const body = await request.json()
    const nickname = String(body.nickname || "").trim().slice(0, 50) || user.username
    const avatarUrl = String(body.avatar_url || body.avatarUrl || "").trim() || "/avatar.jpg"

    const result = await query(
      `
        UPDATE users
        SET nickname = $1, avatar_url = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, username, nickname, avatar_url, bind_code, created_at
      `,
      [nickname, avatarUrl, user.id],
    )

    return Response.json(sanitizeUser(result.rows[0]))
  } catch (error) {
    return apiError(error, "保存个人资料失败")
  }
}
