import { pool } from '../../../db'

export async function GET() {
  const res = await pool.query('SELECT * FROM settings')
  const settings = {}
  res.rows.forEach(r => settings[r.key] = r.value)
  return Response.json(settings)
}

export async function POST(request) {
  const body = await request.json()
  const { key, value } = body
  if (!key) return Response.json({ error: 'key 必填' }, { status: 400 })
  await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', [key, value || ''])
  return Response.json({ success: true })
}