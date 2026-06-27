import { apiError, getPartnerId, getRequiredUser } from "../../../../lib/auth"
import { query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10)
    const params = [user.id, date]

    let partnerSql = ""
    if (partnerId) {
      params.push(partnerId)
      partnerSql = `
        OR (m.user_id = $3 AND m.visibility = 'shared')
      `
    }

    const result = await query(
      `
        SELECT m.*, u.nickname AS author_nickname, u.username AS author_username, u.avatar_url AS author_avatar
        FROM moods m
        JOIN users u ON u.id = m.user_id
        WHERE m.deleted_at IS NULL
          AND m.date = $2
          AND (m.user_id = $1 ${partnerSql})
        ORDER BY m.user_id = $1 DESC, m.updated_at DESC
      `,
      params,
    )

    return Response.json({
      date,
      mine: result.rows.find((row) => row.user_id === user.id) || null,
      partner: partnerId ? result.rows.find((row) => row.user_id === partnerId) || null : null,
    })
  } catch (error) {
    return apiError(error, "读取今日心情失败")
  }
}
