import { pool } from '../../../../db'

export async function GET() {
  const [totalRecords, totalMoods, totalWishes, completedWishes, avgMood, annCount, startDateRow] = await Promise.all([
    pool.query('SELECT COUNT(*) as c FROM records'),
    pool.query('SELECT COUNT(*) as c FROM moods'),
    pool.query('SELECT COUNT(*) as c FROM wishes'),
    pool.query('SELECT COUNT(*) as c FROM wishes WHERE completed = TRUE'),
    pool.query('SELECT AVG(mood) as a FROM moods'),
    pool.query('SELECT COUNT(*) as c FROM anniversaries'),
    pool.query("SELECT value FROM settings WHERE key = 'startDate'"),
  ])

  let daysTogether = 1
  if (startDateRow.rows[0]?.value) {
    daysTogether = Math.max(1, Math.floor((Date.now() - new Date(startDateRow.rows[0].value).getTime()) / 86400000))
  }

  return Response.json({
    totalRecords: parseInt(totalRecords.rows[0].c),
    totalMoods: parseInt(totalMoods.rows[0].c),
    totalWishes: parseInt(totalWishes.rows[0].c),
    completedWishes: parseInt(completedWishes.rows[0].c),
    avgMood: avgMood.rows[0].a ? parseFloat(avgMood.rows[0].a).toFixed(1) : '-',
    daysTogether,
    anniversaries: parseInt(annCount.rows[0].c),
  })
}
