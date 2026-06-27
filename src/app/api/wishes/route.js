import { apiError, getPartnerId, getRequiredUser, normalizeVisibility } from "../../../lib/auth"
import { query } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get("owner")
    const params = [user.id]

    let sql = `
      SELECT w.*, u.nickname AS author_nickname, u.username AS author_username, u.avatar_url AS author_avatar
      FROM wishes w
      JOIN users u ON u.id = w.user_id
      WHERE w.deleted_at IS NULL
        AND (
          w.user_id = $1
          ${partnerId ? "OR (w.user_id = $2 AND w.visibility = 'shared')" : ""}
        )
    `

    if (partnerId) params.push(partnerId)
    if (owner === "mine") sql += " AND w.user_id = $1"
    if (owner === "partner" && partnerId) sql += " AND w.user_id = $2"
    if (owner === "partner" && !partnerId) sql += " AND 1 = 0"

    sql += `
      ORDER BY w.completed ASC,
        CASE w.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        w.created_at DESC,
        w.id DESC
    `
    const result = await query(sql, params)
    return Response.json(result.rows)
  } catch (error) {
    return apiError(error, "读取愿望失败")
  }
}

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const body = await request.json()
    const content = String(body.content || "").trim()

    if (!content) return Response.json({ error: "内容必填" }, { status: 400 })

    const result = await query(
      `
        INSERT INTO wishes (user_id, content, priority, completed, target_date, visibility)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        user.id,
        content,
        body.priority || "medium",
        Boolean(body.completed),
        body.target_date || "",
        normalizeVisibility(body.visibility || "shared", Boolean(partnerId)),
      ],
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    return apiError(error, "保存愿望失败")
  }
}
