import { apiError, getRequiredUser } from "../../../lib/auth"
import { query } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getRequiredUser()
    const result = await query("SELECT key, value FROM settings WHERE user_id = $1 OR user_id IS NULL", [user.id])
    const settings = {}
    result.rows.forEach((row) => {
      settings[row.key] = row.value
    })
    return Response.json(settings)
  } catch (error) {
    return apiError(error, "读取设置失败")
  }
}

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const body = await request.json()
    const entries = body.entries || (body.key ? [[body.key, body.value || ""]] : [])
    if (!entries.length) return Response.json({ error: "设置内容不能为空" }, { status: 400 })

    for (const [key, value] of entries) {
      const existing = await query("SELECT key FROM settings WHERE key = $1 AND user_id = $2", [key, user.id])
      if (existing.rowCount) {
        await query("UPDATE settings SET value = $1 WHERE key = $2 AND user_id = $3", [value || "", key, user.id])
      } else {
        await query("INSERT INTO settings (key, value, user_id) VALUES ($1, $2, $3)", [key, value || "", user.id])
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "保存设置失败")
  }
}
