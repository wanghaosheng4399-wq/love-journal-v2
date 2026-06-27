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
    const date = String(body.date || "").trim()
    const mood = String(body.mood || "").trim()
    const moodText = String(body.mood_text || body.moodText || "").trim()
    const note = String(body.note || "").trim()

    if (!date) return Response.json({ error: "日期必填" }, { status: 400 })
    if (!mood) return Response.json({ error: "请选择心情" }, { status: 400 })

    const result = await query(
      `
        UPDATE moods
        SET date=$1, mood=$2, mood_text=$3, note=$4, visibility=$5, updated_at=NOW()
        WHERE id=$6 AND user_id=$7 AND deleted_at IS NULL
        RETURNING *
      `,
      [date, mood, moodText, note, normalizeVisibility(body.visibility, Boolean(partnerId)), id, user.id],
    )

    if (!result.rowCount) return Response.json({ error: "只能修改自己的心情" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    return apiError(error, "更新心情失败")
  }
}

export async function DELETE(_request, context) {
  try {
    const user = await getRequiredUser()
    const { id } = await context.params
    const result = await query(
      "UPDATE moods SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [id, user.id],
    )

    if (!result.rowCount) return Response.json({ error: "只能删除自己的心情" }, { status: 404 })
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "删除心情失败")
  }
}
