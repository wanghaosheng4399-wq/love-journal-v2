import { ensureDb } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const database = await ensureDb()
    return Response.json({
      ok: true,
      database,
      mode: database ? "live" : "offline",
    })
  } catch (error) {
    console.error("GET /api/health failed", error)
    return Response.json({
      ok: false,
      database: false,
      mode: "offline",
      error: "数据库连接失败",
    })
  }
}
