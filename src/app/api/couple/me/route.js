import { apiError, getAcceptedPartner, getRequiredUser, sanitizeUser } from "../../../../lib/auth"
import { query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getRequiredUser()
    const partner = await getAcceptedPartner(user.id)
    const pendingReceived = await query(
      `
        SELECT cl.id, cl.created_at, u.id AS requester_id, u.nickname, u.username, u.avatar_url
        FROM couple_links cl
        JOIN users u ON u.id = cl.requester_id
        WHERE cl.receiver_id = $1 AND cl.status = 'pending'
        ORDER BY cl.created_at DESC
      `,
      [user.id],
    )
    const pendingSent = await query(
      `
        SELECT cl.id, cl.created_at, u.id AS receiver_id, u.nickname, u.username, u.avatar_url
        FROM couple_links cl
        JOIN users u ON u.id = cl.receiver_id
        WHERE cl.requester_id = $1 AND cl.status = 'pending'
        ORDER BY cl.created_at DESC
      `,
      [user.id],
    )

    return Response.json({
      user: sanitizeUser(user),
      partner: partner ? sanitizeUser(partner) : null,
      pendingReceived: pendingReceived.rows,
      pendingSent: pendingSent.rows,
    })
  } catch (error) {
    return apiError(error, "读取绑定状态失败")
  }
}
