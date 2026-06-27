import { apiError, getRequiredUser } from "../../../lib/auth"
import { query } from "../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function getVisibleRecord(recordId, userId) {
  const result = await query(
    `
      SELECT r.*
      FROM records r
      LEFT JOIN couple_links cl
        ON cl.status = 'accepted'
       AND (cl.requester_id = $2 OR cl.receiver_id = $2)
       AND (cl.requester_id = r.user_id OR cl.receiver_id = r.user_id)
      WHERE r.id = $1
        AND r.deleted_at IS NULL
        AND (
          r.user_id = $2
          OR (r.visibility = 'shared' AND cl.id IS NOT NULL)
        )
      LIMIT 1
    `,
    [recordId, userId],
  )
  return result.rows[0] || null
}

export async function GET(request) {
  try {
    const user = await getRequiredUser()
    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get("recordId")
    if (!recordId) return Response.json({ error: "缺少日常记录 ID" }, { status: 400 })

    const record = await getVisibleRecord(recordId, user.id)
    if (!record) return Response.json({ error: "记录不可见" }, { status: 404 })

    const result = await query(
      `
        SELECT c.*, u.nickname AS author_nickname, u.username AS author_username, u.avatar_url AS author_avatar
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.record_id = $1 AND c.deleted_at IS NULL
        ORDER BY c.created_at ASC, c.id ASC
      `,
      [recordId],
    )

    return Response.json(result.rows)
  } catch (error) {
    return apiError(error, "读取评论失败")
  }
}

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const body = await request.json()
    const recordId = body.record_id || body.recordId
    const content = String(body.content || "").trim()

    if (!recordId) return Response.json({ error: "缺少日常记录 ID" }, { status: 400 })
    if (!content) return Response.json({ error: "评论内容必填" }, { status: 400 })

    const record = await getVisibleRecord(recordId, user.id)
    if (!record) return Response.json({ error: "记录不可见" }, { status: 404 })
    if (record.visibility !== "shared") {
      return Response.json({ error: "私密记录不能评论" }, { status: 403 })
    }

    const result = await query(
      `
        INSERT INTO comments (record_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [recordId, user.id, content],
    )

    return Response.json(result.rows[0], { status: 201 })
  } catch (error) {
    return apiError(error, "保存评论失败")
  }
}
