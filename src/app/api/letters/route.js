import { ensureDb, pool } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const result = await pool.query("SELECT * FROM letters ORDER BY created_at DESC, id DESC")
    return Response.json(result.rows)
  } catch (error) {
    console.error("GET /api/letters failed", error)
    return Response.json({ error: "读取情书失败" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const body = await request.json()
    const { title, content, visible_on } = body
    if (!title || !content) return Response.json({ error: "标题和内容必填" }, { status: 400 })

    const result = await pool.query(
      "INSERT INTO letters (title, content, visible_on) VALUES ($1, $2, $3) RETURNING *",
      [title, content, visible_on || ""],
    )
    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("POST /api/letters failed", error)
    return Response.json({ error: "保存情书失败" }, { status: 500 })
  }
}
