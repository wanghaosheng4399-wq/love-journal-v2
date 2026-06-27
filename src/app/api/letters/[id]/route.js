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
    const content = String(body.content || "").trim()

    if (!title || !content) return Response.json({ error: "标题和内容必填" }, { status: 400 })

    const result = await query(
      `
        UPDATE letters
        SET title=$1, content=$2, visible_on=$3, visibility=$4, updated_at=NOW()
        WHERE id=$5 AND user_id=$6 AND deleted_at IS NULL
        RETURNING *
      `,
      [title, content, body.visible_on || "", normalizeVisibility(body.visibility || "shared", Boolean(partnerId)), id, user.id],
    )

    if (!result.rowCount) return Response.json({ error: "只能修改自己的信件" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    return apiError(error, "更新信件失败")
  }
}

export async function DELETE(_request, context) {
  try {
    const user = await getRequiredUser()
    const { id } = await context.params
    const result = await query(
      "UPDATE letters SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [id, user.id],
    )

    if (!result.rowCount) return Response.json({ error: "只能删除自己的信件" }, { status: 404 })
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "删除信件失败")
  }
}
