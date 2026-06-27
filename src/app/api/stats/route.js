import { ensureDb, pool } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const ready = await ensureDb()
    if (!ready) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 503 })

    const [
      totalRecords,
      favoriteRecords,
      totalMoods,
      totalWishes,
      completedWishes,
      avgMood,
      annCount,
      letterCount,
      firstDateRow,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM records"),
      pool.query("SELECT COUNT(*)::int AS count FROM records WHERE is_favorite = TRUE"),
      pool.query("SELECT COUNT(*)::int AS count FROM moods"),
      pool.query("SELECT COUNT(*)::int AS count FROM wishes"),
      pool.query("SELECT COUNT(*)::int AS count FROM wishes WHERE completed = TRUE"),
      pool.query("SELECT AVG(mood)::numeric(10,1) AS avg FROM moods"),
      pool.query("SELECT COUNT(*)::int AS count FROM anniversaries"),
      pool.query("SELECT COUNT(*)::int AS count FROM letters"),
      pool.query(`
        SELECT MIN(date) AS first_date
        FROM (
          SELECT date FROM records WHERE date <> ''
          UNION ALL
          SELECT date FROM anniversaries WHERE date <> ''
        ) AS all_dates
      `),
    ])

    const startDate = firstDateRow.rows[0]?.first_date
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null
    const daysTogether = start ? Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000) + 1) : 0

    return Response.json({
      totalRecords: totalRecords.rows[0].count,
      favoriteRecords: favoriteRecords.rows[0].count,
      totalMoods: totalMoods.rows[0].count,
      totalWishes: totalWishes.rows[0].count,
      completedWishes: completedWishes.rows[0].count,
      avgMood: avgMood.rows[0].avg || "-",
      daysTogether,
      anniversaries: annCount.rows[0].count,
      totalLetters: letterCount.rows[0].count,
    })
  } catch (error) {
    console.error("GET /api/stats failed", error)
    return Response.json({ error: "读取统计失败" }, { status: 500 })
  }
}
