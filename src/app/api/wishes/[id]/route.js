import { ensureDb, pool } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    const body = await request.json()
    const { content, priority, completed, target_date } = body
    if (!content) return Response.json({ error: "内容必填" }, { status: 400 })

    const result = await pool.query(
      `UPDATE wishes
       SET content=$1, priority=$2, completed=$3, target_date=$4, updated_at=NOW()
       WHERE id=$5
       RETURNING *`,
      [content, priority || "medium", Boolean(completed), target_date || "", id],
    )
    if (!result.rowCount) return Response.json({ error: "愿望不存在" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    console.error("PUT /api/wishes/[id] failed", error)
    return Response.json({ error: "更新愿望失败" }, { status: 500 })
  }
}

export async function DELETE(_request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    await pool.query("DELETE FROM wishes WHERE id = $1", [id])
    return Response.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/wishes/[id] failed", error)
    return Response.json({ error: "删除愿望失败" }, { status: 500 })
  }
}
