import { apiError, getPartnerId, getRequiredUser, normalizeVisibility } from "../../../lib/auth"
import { query } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function buildMoodWhere(userId, partnerId, searchParams) {
  const params = [userId]
  let sql = `
    FROM moods m
    JOIN users u ON u.id = m.user_id
    WHERE m.deleted_at IS NULL
      AND (
        m.user_id = $1
        ${partnerId ? "OR (m.user_id = $2 AND m.visibility = 'shared')" : ""}
      )
  `

  if (partnerId) params.push(partnerId)

  const owner = searchParams.get("owner")
  if (owner === "mine") sql += " AND m.user_id = $1"
  if (owner === "partner" && partnerId) sql += " AND m.user_id = $2"
  if (owner === "partner" && !partnerId) sql += " AND 1 = 0"

  const visibility = searchParams.get("visibility")
  if (visibility === "private" || visibility === "shared") {
    params.push(visibility)
    sql += ` AND m.visibility = $${params.length}`
  }

  return { sql, params }
}

export async function GET(request) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get("limit") || 80), 200)
    const { sql, params } = buildMoodWhere(user.id, partnerId, searchParams)

    params.push(limit)
    const result = await query(
      `
        SELECT m.*, u.nickname AS author_nickname, u.username AS author_username, u.avatar_url AS author_avatar
        ${sql}
        ORDER BY m.date DESC, m.created_at DESC, m.id DESC
        LIMIT $${params.length}
      `,
      params,
    )

    return Response.json(result.rows)
  } catch (error) {
    return apiError(error, "读取心情失败")
  }
}

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const body = await request.json()
    const date = String(body.date || "").trim()
    const mood = String(body.mood || "").trim()
    const moodText = String(body.mood_text || body.moodText || "").trim()
    const note = String(body.note || "").trim()

    if (!date) return Response.json({ error: "日期必填" }, { status: 400 })
    if (!mood) return Response.json({ error: "请选择心情" }, { status: 400 })

    const visibility = normalizeVisibility(body.visibility, Boolean(partnerId))
    const updated = await query(
      `
        UPDATE moods
        SET mood = $1, mood_text = $2, note = $3, visibility = $4, updated_at = NOW()
        WHERE user_id = $5 AND date = $6 AND deleted_at IS NULL
        RETURNING *
      `,
      [mood, moodText, note, visibility, user.id, date],
    )

    if (updated.rowCount) return Response.json(updated.rows[0])

    const inserted = await query(
      `
        INSERT INTO moods (user_id, date, mood, mood_text, note, visibility)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [user.id, date, mood, moodText, note, visibility],
    )

    return Response.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    return apiError(error, "保存心情失败")
  }
}
