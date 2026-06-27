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
    const content = String(body.content || "").trim()

    if (!content) return Response.json({ error: "内容必填" }, { status: 400 })

    const result = await query(
      `
        UPDATE wishes
        SET content=$1, priority=$2, completed=$3, target_date=$4, visibility=$5, updated_at=NOW()
        WHERE id=$6 AND user_id=$7 AND deleted_at IS NULL
        RETURNING *
      `,
      [
        content,
        body.priority || "medium",
        Boolean(body.completed),
        body.target_date || "",
        normalizeVisibility(body.visibility || "shared", Boolean(partnerId)),
        id,
        user.id,
      ],
    )

    if (!result.rowCount) return Response.json({ error: "只能修改自己的愿望" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    return apiError(error, "更新愿望失败")
  }
}

export async function DELETE(_request, context) {
  try {
    const user = await getRequiredUser()
    const { id } = await context.params
    const result = await query(
      "UPDATE wishes SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [id, user.id],
    )

    if (!result.rowCount) return Response.json({ error: "只能删除自己的愿望" }, { status: 404 })
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "删除愿望失败")
  }
}
