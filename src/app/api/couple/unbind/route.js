import { apiError, getRequiredUser } from "../../../../lib/auth"
import { query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const user = await getRequiredUser()
    await query(
      `
        UPDATE couple_links
        SET status = 'ended', ended_at = NOW()
        WHERE status = 'accepted'
          AND (requester_id = $1 OR receiver_id = $1)
      `,
      [user.id],
    )
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "解除绑定失败")
  }
}
