import { pool } from '../../../../db'

export async function GET() {
  const res = await pool.query(
    "SELECT * FROM wishes ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, id DESC"
  )
  return Response.json(res.rows)
}

export async function POST(request) {
  const body = await request.json()
  const { content, priority } = body
  if (!content) return Response.json({ error: '内容必填' }, { status: 400 })
  const res = await pool.query(
    'INSERT INTO wishes (content, priority) VALUES ($1, $2) RETURNING id',
    [content, priority || 'medium']
  )
  return Response.json({ id: res.rows[0].id }, { status: 201 })
}

export async function PUT(request, { params }) {
  const body = await request.json()
  await pool.query(
    'UPDATE wishes SET content=$1, priority=$2, completed=$3, updated_at=NOW() WHERE id=$4',
    [body.content, body.priority, body.completed ? true : false, params.id]
  )
  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  await pool.query('DELETE FROM wishes WHERE id = $1', [params.id])
  return Response.json({ success: true })
}
