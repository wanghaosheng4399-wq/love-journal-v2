import { pool } from '../../../../db'

export async function GET() {
  const res = await pool.query('SELECT * FROM moods ORDER BY date DESC')
  return Response.json(res.rows)
}

export async function POST(request) {
  const body = await request.json()
  const { date, mood, note } = body
  if (!date) return Response.json({ error: '日期必填' }, { status: 400 })
  await pool.query(
    'INSERT INTO moods (date, mood, note) VALUES ($1, $2, $3) ON CONFLICT (date) DO UPDATE SET mood=$2, note=$3, updated_at=NOW()',
    [date, mood || 3, note || '']
  )
  return Response.json({ success: true }, { status: 201 })
}
