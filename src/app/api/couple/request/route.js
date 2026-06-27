import { apiError, getAcceptedPartner, getRequiredUser } from "../../../../lib/auth"
import { query } from "../../../../lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request) {
  try {
    const user = await getRequiredUser()
    const body = await request.json()
    const bindCode = String(body.bindCode || "").trim().toUpperCase()
    if (!bindCode) return Response.json({ error: "请输入对方绑定码" }, { status: 400 })

    const target = await query("SELECT id FROM users WHERE bind_code = $1", [bindCode])
    const receiver = target.rows[0]
    if (!receiver) return Response.json({ error: "绑定码不存在" }, { status: 404 })
    if (receiver.id === user.id) return Response.json({ error: "不能绑定自己" }, { status: 400 })
    if (await getAcceptedPartner(user.id)) return Response.json({ error: "你已经绑定了情侣" }, { status: 409 })
    if (await getAcceptedPartner(receiver.id)) return Response.json({ error: "对方已经绑定了情侣" }, { status: 409 })

    const existing = await query(
      `
        SELECT id FROM couple_links
        WHERE status = 'pending'
          AND (
            (requester_id = $1 AND receiver_id = $2)
            OR (requester_id = $2 AND receiver_id = $1)
          )
      `,
      [user.id, receiver.id],
    )
    if (existing.rowCount) return Response.json({ error: "已经有待处理申请" }, { status: 409 })

    await query("INSERT INTO couple_links (requester_id, receiver_id) VALUES ($1, $2)", [user.id, receiver.id])
    return Response.json({ success: true })
  } catch (error) {
    return apiError(error, "发送绑定申请失败")
  }
}
