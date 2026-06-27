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
    const name = String(body.name || "").trim()
    const date = String(body.date || "").trim()

    if (!name || !date) return Response.json({ error: "名称和日期必填" }, { status: 400 })

    const result = await query(
      `
        UPDATE anniversaries
        SET name=$1, date=$2, icon=$3, visibility=$4, updated_at=NOW()
        WHERE id=$5 AND user_id=$6 AND deleted_at IS NULL
        RETURNING *
      `,
      [name, date, body.icon || "♥", normalizeVisibility(body.visibility || "shared", Boolean(partnerId)), id, user.id],
    )

    if (!result.rowCount) return Response.json({ error: "只能修改自己的纪念日" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    return apiError(error, "更新纪念日失败")
  }
}

export async function DELETE(_request, context) {
  try {
    const user = await getRequiredUser()
    const { id } = await context.params
    const result = await query(
      "UPDATE anniversaries SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [id, user.id],
    )

    if (!result.rowCount) return Response.json({ error: "只能删除自己的纪念日" }, { status: 404 })
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "删除纪念日失败")
  }
}
