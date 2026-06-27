import { apiError, getAcceptedPartner, getRequiredUser } from "../../../../lib/auth"
import { query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const { requestId } = await request.json()
    const link = await query(
      "SELECT * FROM couple_links WHERE id = $1 AND receiver_id = $2 AND status = 'pending'",
      [requestId, user.id],
    )
    const row = link.rows[0]
    if (!row) return Response.json({ error: "申请不存在" }, { status: 404 })
    if (await getAcceptedPartner(user.id)) return Response.json({ error: "你已经绑定了情侣" }, { status: 409 })
    if (await getAcceptedPartner(row.requester_id)) return Response.json({ error: "对方已经绑定了情侣" }, { status: 409 })

    await query("UPDATE couple_links SET status = 'accepted', accepted_at = NOW() WHERE id = $1", [row.id])
    await query(
      `
        UPDATE couple_links
        SET status = 'rejected'
        WHERE status = 'pending'
          AND id <> $1
          AND (requester_id IN ($2, $3) OR receiver_id IN ($2, $3))
      `,
      [row.id, row.requester_id, row.receiver_id],
    )
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "同意绑定失败")
  }
}
