import { pool } from '../../../db'

export async function GET() {
  const res = await pool.query('SELECT * FROM anniversaries ORDER BY date ASC')
  return Response.json(res.rows)
}

export async function POST(request) {
  const body = await request.json()
  const { name, date, icon } = body
  if (!name || !date) return Response.json({ error: '名称和日期必填' }, { status: 400 })
  const res = await pool.query(
    'INSERT INTO anniversaries (name, date, icon) VALUES ($1, $2, $3) RETURNING id',
    [name, date, icon || '\u2764\uFE0F']
  )
  return Response.json({ id: res.rows[0].id }, { status: 201 })
}

export async function DELETE(request, { params }) {
  await pool.query('DELETE FROM anniversaries WHERE id = $1', [params.id])
  return Response.json({ success: true })
}