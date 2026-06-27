import { ensureDb, pool } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const result = await pool.query(
      "SELECT * FROM wishes ORDER BY completed ASC, CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, id DESC",
    )
    return Response.json(result.rows)
  } catch (error) {
    console.error("GET /api/wishes failed", error)
    return Response.json({ error: "读取愿望失败" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const body = await request.json()
    const { content, priority, target_date } = body
    if (!content) return Response.json({ error: "内容必填" }, { status: 400 })

    const result = await pool.query(
      "INSERT INTO wishes (content, priority, target_date) VALUES ($1, $2, $3) RETURNING *",
      [content, priority || "medium", target_date || ""],
    )
    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("POST /api/wishes failed", error)
    return Response.json({ error: "保存愿望失败" }, { status: 500 })
  }
}
