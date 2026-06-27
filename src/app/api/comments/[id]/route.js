import { apiError, getRequiredUser } from "../../../../lib/auth"
import { query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_request, context) {
  try {
    const user = await getRequiredUser()
    const { id } = await context.params
    const result = await query(
      `
        UPDATE comments c
        SET deleted_at = NOW(), updated_at = NOW()
        FROM records r
        WHERE c.id = $1
          AND c.record_id = r.id
          AND c.deleted_at IS NULL
          AND (c.user_id = $2 OR r.user_id = $2)
        RETURNING c.id
      `,
      [id, user.id],
    )

    if (!result.rowCount) return Response.json({ error: "只能删除自己的评论或自己记录下的评论" }, { status: 404 })
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "删除评论失败")
  }
}
