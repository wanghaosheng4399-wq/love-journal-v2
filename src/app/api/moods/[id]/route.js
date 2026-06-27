import { ensureDb, pool } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    const body = await request.json()
    const { date, mood, note } = body
    if (!date) return Response.json({ error: "日期必填" }, { status: 400 })

    const result = await pool.query(
      "UPDATE moods SET date=$1, mood=$2, note=$3, updated_at=NOW() WHERE id=$4 RETURNING *",
      [date, Number(mood || 3), note || "", id],
    )
    if (!result.rowCount) return Response.json({ error: "心情记录不存在" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    console.error("PUT /api/moods/[id] failed", error)
    return Response.json({ error: "更新心情失败" }, { status: 500 })
  }
}

export async function DELETE(_request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    await pool.query("DELETE FROM moods WHERE id = $1", [id])
    return Response.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/moods/[id] failed", error)
    return Response.json({ error: "删除心情失败" }, { status: 500 })
  }
}
