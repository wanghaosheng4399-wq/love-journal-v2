import { ensureDb, pool } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    const body = await request.json()
    const { name, date, icon } = body
    if (!name || !date) return Response.json({ error: "名称和日期必填" }, { status: 400 })

    const result = await pool.query(
      "UPDATE anniversaries SET name=$1, date=$2, icon=$3, updated_at=NOW() WHERE id=$4 RETURNING *",
      [name, date, icon || "♥", id],
    )
    if (!result.rowCount) return Response.json({ error: "纪念日不存在" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    console.error("PUT /api/anniversaries/[id] failed", error)
    return Response.json({ error: "更新纪念日失败" }, { status: 500 })
  }
}

export async function DELETE(_request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    await pool.query("DELETE FROM anniversaries WHERE id = $1", [id])
    return Response.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/anniversaries/[id] failed", error)
    return Response.json({ error: "删除纪念日失败" }, { status: 500 })
  }
}
