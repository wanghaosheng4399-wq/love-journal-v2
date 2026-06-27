import { apiError, getPartnerId, getRequiredUser } from "../../../lib/auth"
import { query } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function scopeSql(alias, partnerId, sharedOnly = false) {
  if (!partnerId) return `${alias}.user_id = $1`
  if (sharedOnly) return `${alias}.user_id = $1 OR (${alias}.user_id = $2 AND ${alias}.visibility = 'shared')`
  return `${alias}.user_id = $1 OR (${alias}.user_id = $2 AND ${alias}.visibility = 'shared')`
}

export async function GET() {
  try {
    const user = await getRequiredUser()
    const partnerId = await getPartnerId(user.id)
    const params = partnerId ? [user.id, partnerId] : [user.id]

    const [
      totalRecords,
      favoriteRecords,
      totalMoods,
      totalWishes,
      completedWishes,
      annCount,
      letterCount,
      firstDateRow,
    ] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM records r WHERE r.deleted_at IS NULL AND (${scopeSql("r", partnerId)})`, params),
      query(
        `SELECT COUNT(*)::int AS count FROM records r WHERE r.deleted_at IS NULL AND r.is_favorite = TRUE AND (${scopeSql("r", partnerId)})`,
        params,
      ),
      query(`SELECT COUNT(*)::int AS count FROM moods m WHERE m.deleted_at IS NULL AND (${scopeSql("m", partnerId)})`, params),
      query(`SELECT COUNT(*)::int AS count FROM wishes w WHERE w.deleted_at IS NULL AND (${scopeSql("w", partnerId)})`, params),
      query(
        `SELECT COUNT(*)::int AS count FROM wishes w WHERE w.deleted_at IS NULL AND w.completed = TRUE AND (${scopeSql("w", partnerId)})`,
        params,
      ),
      query(`SELECT COUNT(*)::int AS count FROM anniversaries a WHERE a.deleted_at IS NULL AND (${scopeSql("a", partnerId)})`, params),
      query(`SELECT COUNT(*)::int AS count FROM letters l WHERE l.deleted_at IS NULL AND (${scopeSql("l", partnerId)})`, params),
      query(
        `
          SELECT MIN(date) AS first_date
          FROM (
            SELECT date FROM records r WHERE r.deleted_at IS NULL AND r.date <> '' AND (${scopeSql("r", partnerId)})
            UNION ALL
            SELECT date FROM anniversaries a WHERE a.deleted_at IS NULL AND a.date <> '' AND (${scopeSql("a", partnerId)})
          ) AS all_dates
        `,
        params,
      ),
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
      daysTogether,
      anniversaries: annCount.rows[0].count,
      totalLetters: letterCount.rows[0].count,
    })
  } catch (error) {
    return apiError(error, "读取统计失败")
  }
}
