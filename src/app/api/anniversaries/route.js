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
      SELECT a.*, u.nickname AS author_nickname, u.username AS author_username, u.avatar_url AS author_avatar
      FROM anniversaries a
      JOIN users u ON u.id = a.user_id
      WHERE a.deleted_at IS NULL
        AND (
          a.user_id = $1
          ${partnerId ? "OR (a.user_id = $2 AND a.visibility = 'shared')" : ""}
        )
    `

    if (partnerId) params.push(partnerId)
    if (owner === "mine") sql += " AND a.user_id = $1"
    if (owner === "partner" && partnerId) sql += " AND a.user_id = $2"
    if (owner === "partner" && !partnerId) sql += " AND 1 = 0"

    sql += " ORDER BY a.date ASC, a.created_at DESC, a.id DESC"
    const result = await query(sql, params)
    return Response.json(result.rows)
  } catch (error) {
    return apiError(error, "读取纪念日失败")
  }
}

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const body = await request.json()
    const name = String(body.name || "").trim()
    const date = String(body.date || "").trim()

    if (!name || !date) return Response.json({ error: "名称和日期必填" }, { status: 400 })

    const result = await query(
      `
        INSERT INTO anniversaries (user_id, name, date, icon, visibility)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [user.id, name, date, body.icon || "♥", normalizeVisibility(body.visibility || "shared", Boolean(partnerId))],
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    return apiError(error, "保存纪念日失败")
  }
}
