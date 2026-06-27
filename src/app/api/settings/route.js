import { ensureDb, pool } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const result = await pool.query("SELECT * FROM settings")
    const settings = {}
    result.rows.forEach((row) => {
      settings[row.key] = row.value
    })
    return Response.json(settings)
  } catch (error) {
    console.error("GET /api/settings failed", error)
    return Response.json({ error: "读取设置失败" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const body = await request.json()
    const entries = body.entries || (body.key ? [[body.key, body.value || ""]] : [])
    if (!entries.length) return Response.json({ error: "设置内容不能为空" }, { status: 400 })

    for (const [key, value] of entries) {
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2",
        [key, value || ""],
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("POST /api/settings failed", error)
    return Response.json({ error: "保存设置失败" }, { status: 500 })
  }
}
