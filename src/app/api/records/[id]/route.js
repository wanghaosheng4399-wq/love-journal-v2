import { apiError, getPartnerId, getRequiredUser, normalizeVisibility } from "../../../../lib/auth"
import { query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request, context) {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const { id } = await context.params
    const body = await request.json()
    const title = String(body.title || "").trim()
    const date = String(body.date || "").trim()
    if (!title || !date) return Response.json({ error: "标题和日期必填" }, { status: 400 })

    const result = await query(
      `
        UPDATE records
        SET date=$1, type=$2, title=$3, content=$4, location=$5, mood=$6,
            photo_url=$7, tags=$8, is_favorite=$9, visibility=$10, updated_at=NOW()
        WHERE id=$11 AND user_id=$12 AND deleted_at IS NULL
        RETURNING *
      `,
      [
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
        id,
        user.id,
      ],
    )
    if (!result.rowCount) return Response.json({ error: "只能修改自己的日常" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    return apiError(error, "更新日常失败")
  }
}

export async function DELETE(_request, context) {
  try {
    const user = await getRequiredUser()
    const { id } = await context.params
    const result = await query(
      "UPDATE records SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [id, user.id],
    )
    if (!result.rowCount) return Response.json({ error: "只能删除自己的日常" }, { status: 404 })
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "删除日常失败")
  }
}
