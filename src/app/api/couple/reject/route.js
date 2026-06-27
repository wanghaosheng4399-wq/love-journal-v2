import { apiError, getRequiredUser } from "../../../../lib/auth"
import { query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const { requestId } = await request.json()
    await query(
      "UPDATE couple_links SET status = 'rejected' WHERE id = $1 AND receiver_id = $2 AND status = 'pending'",
      [requestId, user.id],
    )
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "拒绝绑定失败")
  }
}
