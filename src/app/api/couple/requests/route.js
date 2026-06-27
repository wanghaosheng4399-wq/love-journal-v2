import { apiError, getRequiredUser } from "../../../../lib/auth"
import { query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getRequiredUser()
    const result = await query(
      `
        SELECT cl.id, cl.created_at, u.id AS requester_id, u.username, u.nickname, u.avatar_url
        FROM couple_links cl
        JOIN users u ON u.id = cl.requester_id
        WHERE cl.receiver_id = $1 AND cl.status = 'pending'
        ORDER BY cl.created_at DESC
      `,
      [user.id],
    )
    return Response.json(result.rows)
  } catch (error) {
    return apiError(error, "读取绑定申请失败")
  }
}
