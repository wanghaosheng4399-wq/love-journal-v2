import { ensureDb, pool } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const search = searchParams.get("search")
    const favorite = searchParams.get("favorite")
    const params = []
    let sql = "SELECT * FROM records WHERE 1=1"

    if (type && type !== "all") {
      params.push(type)
      sql += ` AND type = $${params.length}`
    }

    if (favorite === "true") {
      sql += " AND is_favorite = TRUE"
    }

    if (search) {
      params.push(`%${search}%`)
      sql += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length} OR tags ILIKE $${params.length})`
    }

    sql += " ORDER BY date DESC, id DESC"
    const result = await pool.query(sql, params)
    return Response.json(result.rows)
  } catch (error) {
    console.error("GET /api/records failed", error)
    return Response.json({ error: "读取记录失败" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const body = await request.json()
    const { date, type, title, content, location, mood, photo_url, tags, is_favorite } = body
    if (!date || !title) return Response.json({ error: "日期和标题必填" }, { status: 400 })

    const result = await pool.query(
      `INSERT INTO records (date, type, title, content, location, mood, photo_url, tags, is_favorite)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      ],
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("POST /api/records failed", error)
    return Response.json({ error: "保存记录失败" }, { status: 500 })
  }
}
