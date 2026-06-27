import { apiError, getPartnerId, getRequiredUser, normalizeVisibility } from "../../../lib/auth"
import { query } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const owner = searchParams.get("owner")
    const visibility = searchParams.get("visibility")
    const search = searchParams.get("search")
    const params = [user.id]

    let sql = `
      SELECT r.*, u.nickname AS author_nickname, u.username AS author_username, u.avatar_url AS author_avatar,
        (SELECT COUNT(*)::int FROM comments c WHERE c.record_id = r.id AND c.deleted_at IS NULL) AS comment_count
      FROM records r
      JOIN users u ON u.id = r.user_id
      WHERE r.deleted_at IS NULL
        AND (
          r.user_id = $1
          ${partnerId ? "OR (r.user_id = $2 AND r.visibility = 'shared')" : ""}
        )
    `
    if (partnerId) params.push(partnerId)

    if (owner === "mine") sql += " AND r.user_id = $1"
    if (owner === "partner" && partnerId) sql += ` AND r.user_id = $2`
    if (owner === "partner" && !partnerId) sql += " AND 1 = 0"

    if (type && type !== "all") {
      params.push(type)
      sql += ` AND r.type = $${params.length}`
    }
    if (visibility === "private" || visibility === "shared") {
      params.push(visibility)
      sql += ` AND r.visibility = $${params.length}`
    }
    if (search) {
      params.push(`%${search}%`)
      sql += ` AND (r.title ILIKE $${params.length} OR r.content ILIKE $${params.length} OR r.location ILIKE $${params.length} OR r.tags ILIKE $${params.length})`
    }

    sql += " ORDER BY r.date DESC, r.created_at DESC, r.id DESC"
    const result = await query(sql, params)
    return Response.json(result.rows)
  } catch (error) {
    return apiError(error, "读取日常失败")
  }
}

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const body = await request.json()
    const title = String(body.title || "").trim()
    const date = String(body.date || "").trim()
    if (!title || !date) return Response.json({ error: "标题和日期必填" }, { status: 400 })

    const result = await query(
      `
        INSERT INTO records (user_id, date, type, title, content, location, mood, photo_url, tags, is_favorite, visibility)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        user.id,
        date,
        body.type || "daily",
        title,
        body.content || "",
        body.location || "",
        body.mood || "平静",
        body.photo_url || "",
        body.tags || "",
        Boolean(body.is_favorite),
        normalizeVisibility(body.visibility, Boolean(partnerId)),
      ],
    )
    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    return apiError(error, "保存日常失败")
  }
}
