import { ensureDb, pool } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    const body = await request.json()
    const { title, content, visible_on } = body
    if (!title || !content) return Response.json({ error: "标题和内容必填" }, { status: 400 })

    const result = await pool.query(
      "UPDATE letters SET title=$1, content=$2, visible_on=$3, updated_at=NOW() WHERE id=$4 RETURNING *",
      [title, content, visible_on || "", id],
    )
    if (!result.rowCount) return Response.json({ error: "情书不存在" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    console.error("PUT /api/letters/[id] failed", error)
    return Response.json({ error: "更新情书失败" }, { status: 500 })
  }
}

export async function DELETE(_request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    await pool.query("DELETE FROM letters WHERE id = $1", [id])
    return Response.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/letters/[id] failed", error)
    return Response.json({ error: "删除情书失败" }, { status: 500 })
  }
}
