import { pool } from '../../../../db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const search = searchParams.get('search')
  let sql = 'SELECT * FROM records WHERE 1=1'
  const params = []
  if (type && type !== 'all') { sql += ' AND type = $' + (params.length + 1); params.push(type) }
  if (search) {
    const idx = params.length + 1
    sql += ' AND (title ILIKE $' + idx + ' OR content ILIKE $' + idx + ')'
    params.push('%' + search + '%')
  }
  sql += ' ORDER BY date DESC, id DESC'
  const res = await pool.query(sql, params)
  return Response.json(res.rows)
}

export async function POST(request) {
  const body = await request.json()
  const { date, type, title, content, location, mood } = body
  if (!date || !title) return Response.json({ error: '日期和标题必填' }, { status: 400 })
  const res = await pool.query(
    'INSERT INTO records (date, type, title, content, location, mood) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [date, type || 'daily', title, content || '', location || '', mood || 3]
  )
  return Response.json({ id: res.rows[0].id }, { status: 201 })
}

export async function DELETE(request, { params }) {
  await pool.query('DELETE FROM records WHERE id = $1', [params.id])
  return Response.json({ success: true })
}
