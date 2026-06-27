import { ensureDb, pool } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const result = await pool.query("SELECT * FROM anniversaries ORDER BY date ASC, id ASC")
    return Response.json(result.rows)
  } catch (error) {
    console.error("GET /api/anniversaries failed", error)
    return Response.json({ error: "读取纪念日失败" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const body = await request.json()
    const { name, date, icon } = body
    if (!name || !date) return Response.json({ error: "名称和日期必填" }, { status: 400 })

    const result = await pool.query(
      "INSERT INTO anniversaries (name, date, icon) VALUES ($1, $2, $3) RETURNING *",
      [name, date, icon || "♥"],
    )
    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("POST /api/anniversaries failed", error)
    return Response.json({ error: "保存纪念日失败" }, { status: 500 })
  }
}
