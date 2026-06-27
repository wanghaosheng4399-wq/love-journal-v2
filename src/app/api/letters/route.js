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
      SELECT l.*, u.nickname AS author_nickname, u.username AS author_username, u.avatar_url AS author_avatar
      FROM letters l
      JOIN users u ON u.id = l.user_id
      WHERE l.deleted_at IS NULL
        AND (
          l.user_id = $1
          ${partnerId ? "OR (l.user_id = $2 AND l.visibility = 'shared')" : ""}
        )
    `

    if (partnerId) params.push(partnerId)
    if (owner === "mine") sql += " AND l.user_id = $1"
    if (owner === "partner" && partnerId) sql += " AND l.user_id = $2"
    if (owner === "partner" && !partnerId) sql += " AND 1 = 0"

    sql += " ORDER BY l.created_at DESC, l.id DESC"
    const result = await query(sql, params)
    return Response.json(result.rows)
  } catch (error) {
    return apiError(error, "读取信件失败")
  }
}

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const body = await request.json()
    const title = String(body.title || "").trim()
    const content = String(body.content || "").trim()

    if (!title || !content) return Response.json({ error: "标题和内容必填" }, { status: 400 })

    const result = await query(
      `
        INSERT INTO letters (user_id, title, content, visible_on, visibility)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [user.id, title, content, body.visible_on || "", normalizeVisibility(body.visibility || "shared", Boolean(partnerId))],
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    return apiError(error, "保存信件失败")
  }
}
