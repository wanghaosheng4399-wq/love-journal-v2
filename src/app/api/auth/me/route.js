import { apiError, getAcceptedPartner, getCurrentUser, sanitizeUser } from "../../../../lib/auth"
import { ensureDb, query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "请先登录" }, { status: 401 })

    const partner = await getAcceptedPartner(user.id)
    const pending = await query(
      `
        SELECT cl.id, cl.created_at, u.id AS requester_id, u.nickname, u.username, u.avatar_url
        FROM couple_links cl
        JOIN users u ON u.id = cl.requester_id
        WHERE cl.receiver_id = $1 AND cl.status = 'pending'
        ORDER BY cl.created_at DESC
      `,
      [user.id],
    )

    return Response.json({
      user: sanitizeUser(user),
      partner: partner ? sanitizeUser(partner) : null,
      pendingRequests: pending.rows.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        requester: {
          id: row.requester_id,
          username: row.username,
          nickname: row.nickname || row.username,
          avatar_url: row.avatar_url || "/avatar.jpg",
        },
      })),
    })
  } catch (error) {
    return apiError(error, "读取用户失败")
  }
}
