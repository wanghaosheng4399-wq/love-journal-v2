import { ensureDb, pool } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    const body = await request.json()
    const { date, type, title, content, location, mood, photo_url, tags, is_favorite } = body
    if (!date || !title) return Response.json({ error: "日期和标题必填" }, { status: 400 })

    const result = await pool.query(
      `UPDATE records
       SET date=$1, type=$2, title=$3, content=$4, location=$5, mood=$6,
           photo_url=$7, tags=$8, is_favorite=$9, updated_at=NOW()
       WHERE id=$10
       RETURNING *`,
      [
        date,
        type || "daily",
        title,
        content || "",
        location || "",
        Number(mood || 3),
        photo_url || "",
        tags || "",
        Boolean(is_favorite),
        id,
      ],
    )

    if (!result.rowCount) return Response.json({ error: "记录不存在" }, { status: 404 })
    return Response.json(result.rows[0])
  } catch (error) {
    console.error("PUT /api/records/[id] failed", error)
    return Response.json({ error: "更新记录失败" }, { status: 500 })
  }
}

export async function DELETE(_request, context) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { id } = await context.params
    await pool.query("DELETE FROM records WHERE id = $1", [id])
    return Response.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/records/[id] failed", error)
    return Response.json({ error: "删除记录失败" }, { status: 500 })
  }
}
