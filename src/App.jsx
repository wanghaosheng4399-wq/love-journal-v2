"use client"

import { useEffect, useMemo, useRef, useState } from "react"

const DAY = 24 * 60 * 60 * 1000

const views = [
  { key: "home", label: "首页" },
  { key: "records", label: "日常" },
  { key: "moods", label: "心情" },
  { key: "anniversaries", label: "纪念日" },
  { key: "wishes", label: "愿望" },
  { key: "letters", label: "信件" },
  { key: "photos", label: "照片墙" },
  { key: "settings", label: "设置" },
]

const recordTypes = {
  daily: "日常",
  date: "约会",
  travel: "旅行",
  special: "特别",
}

const moodOptions = [
  { value: "开心", label: "开心", tone: 5 },
  { value: "想你", label: "想你", tone: 4 },
  { value: "期待", label: "期待", tone: 4 },
  { value: "平静", label: "平静", tone: 3 },
  { value: "疲惫", label: "疲惫", tone: 2 },
  { value: "难过", label: "难过", tone: 1 },
  { value: "生气", label: "生气", tone: 1 },
]

const priorityLabels = {
  high: "很想完成",
  medium: "慢慢来",
  low: "以后也好",
}

const emptyStats = {
  totalRecords: 0,
  favoriteRecords: 0,
  totalMoods: 0,
  totalWishes: 0,
  completedWishes: 0,
  daysTogether: 0,
  anniversaries: 0,
  totalLetters: 0,
}

function todayISO() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

function emptyRecord(hasPartner = false) {
  return {
    date: todayISO(),
    type: "daily",
    title: "",
    content: "",
    location: "",
    mood: "开心",
    photo_url: "",
    tags: "",
    is_favorite: false,
    visibility: hasPartner ? "shared" : "private",
  }
}

function emptyAnniversary(hasPartner = false) {
  return { name: "", date: todayISO(), icon: "♥", visibility: hasPartner ? "shared" : "private" }
}

function emptyMood(hasPartner = false) {
  return { date: todayISO(), mood: "开心", mood_text: "今天也想好好爱你", note: "", visibility: hasPartner ? "shared" : "private" }
}

function emptyWish(hasPartner = false) {
  return { content: "", priority: "medium", completed: false, target_date: "", visibility: hasPartner ? "shared" : "private" }
}

function emptyLetter(hasPartner = false) {
  return { title: "", content: "", visible_on: todayISO(), visibility: hasPartner ? "shared" : "private" }
}

async function apiJson(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || "请求失败")
    error.status = response.status
    throw error
  }
  return data
}

function formatDate(value) {
  if (!value) return "未设置"
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date)
}

function formatFullDate(value) {
  if (!value) return "未设置"
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

function getMoodTone(value) {
  return moodOptions.find((item) => item.value === value)?.tone || 3
}

function getAnniversaryTiming(dateString) {
  const original = new Date(`${dateString}T00:00:00`)
  const today = new Date(`${todayISO()}T00:00:00`)
  if (Number.isNaN(original.getTime())) {
    return { passedDays: 0, daysUntil: 0, nextDate: "", yearCount: 0, label: "未设置" }
  }

  const passedDays = Math.max(0, Math.floor((today.getTime() - original.getTime()) / DAY) + 1)
  let nextDate = new Date(today.getFullYear(), original.getMonth(), original.getDate())

  if (original > today) {
    nextDate = original
  } else if (nextDate < today) {
    nextDate = new Date(today.getFullYear() + 1, original.getMonth(), original.getDate())
  }

  const daysUntil = Math.max(0, Math.ceil((nextDate.getTime() - today.getTime()) / DAY))
  const yearCount = Math.max(0, nextDate.getFullYear() - original.getFullYear())

  return {
    passedDays,
    daysUntil,
    nextDate: nextDate.toISOString().slice(0, 10),
    yearCount,
    label: daysUntil === 0 ? "今天" : `${daysUntil} 天`,
  }
}

function isMine(item, user) {
  return item?.user_id === user?.id
}

function authorName(item) {
  return item?.author_nickname || item?.author_username || "我"
}

function compressImage(file, maxSize = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("请选择图片文件"))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error("读取图片失败"))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error("压缩图片失败"))
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const shellRef = useRef(null)
  const mainRef = useRef(null)
  const [booting, setBooting] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [authMode, setAuthMode] = useState("login")
  const [activeView, setActiveView] = useState("home")
  const [notice, setNotice] = useState("")
  const [authError, setAuthError] = useState("")
  const [session, setSession] = useState({ user: null, partner: null, pendingReceived: [], pendingSent: [] })
  const [records, setRecords] = useState([])
  const [anniversaries, setAnniversaries] = useState([])
  const [moods, setMoods] = useState([])
  const [todayMood, setTodayMood] = useState({ mine: null, partner: null })
  const [wishes, setWishes] = useState([])
  const [letters, setLetters] = useState([])
  const [stats, setStats] = useState(emptyStats)
  const [modal, setModal] = useState(null)
  const [recordForm, setRecordForm] = useState(emptyRecord())
  const [anniversaryForm, setAnniversaryForm] = useState(emptyAnniversary())
  const [moodForm, setMoodForm] = useState(emptyMood())
  const [wishForm, setWishForm] = useState(emptyWish())
  const [letterForm, setLetterForm] = useState(emptyLetter())
  const [profileForm, setProfileForm] = useState({ nickname: "", avatar_url: "/avatar.jpg" })

  const hasPartner = Boolean(session.partner)

  useEffect(() => {
    const hash = window.location.hash.replace("#", "")
    if (views.some((view) => view.key === hash)) setActiveView(hash)

    const onHashChange = () => {
      const nextHash = window.location.hash.replace("#", "")
      if (views.some((view) => view.key === nextHash)) setActiveView(nextHash)
    }

    window.addEventListener("hashchange", onHashChange)
    bootstrap()
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(""), 3600)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!session.user) return
    setProfileForm({
      nickname: session.user.nickname || session.user.username,
      avatar_url: session.user.avatar_url || "/avatar.jpg",
    })
  }, [session.user?.id, session.user?.nickname, session.user?.avatar_url])

  function applySession(payload) {
    setSession({
      user: payload.user || null,
      partner: payload.partner || null,
      pendingReceived: payload.pendingReceived || payload.pendingRequests || [],
      pendingSent: payload.pendingSent || [],
    })
  }

  async function bootstrap() {
    setBooting(true)
    setAuthError("")
    try {
      await apiJson("/api/auth/me")
      await reloadAll()
    } catch (error) {
      if (error.status !== 401) setAuthError(error.message || "读取登录状态失败")
      setSession({ user: null, partner: null, pendingReceived: [], pendingSent: [] })
    } finally {
      setBooting(false)
    }
  }

  async function reloadAll() {
    setDataLoading(true)
    const date = todayISO()
    try {
      const [couple, nextRecords, nextAnniversaries, nextMoods, nextTodayMood, nextWishes, nextLetters, nextStats] =
        await Promise.all([
          apiJson("/api/couple/me"),
          apiJson("/api/records"),
          apiJson("/api/anniversaries"),
          apiJson("/api/moods?limit=120"),
          apiJson(`/api/moods/today?date=${date}`),
          apiJson("/api/wishes"),
          apiJson("/api/letters"),
          apiJson("/api/stats"),
        ])

      applySession(couple)
      setRecords(Array.isArray(nextRecords) ? nextRecords : [])
      setAnniversaries(Array.isArray(nextAnniversaries) ? nextAnniversaries : [])
      setMoods(Array.isArray(nextMoods) ? nextMoods : [])
      setTodayMood(nextTodayMood || { mine: null, partner: null })
      setWishes(Array.isArray(nextWishes) ? nextWishes : [])
      setLetters(Array.isArray(nextLetters) ? nextLetters : [])
      setStats(nextStats || emptyStats)
    } catch (error) {
      if (error.status === 401) {
        setSession({ user: null, partner: null, pendingReceived: [], pendingSent: [] })
      } else {
        setNotice(error.message || "同步失败")
      }
    } finally {
      setDataLoading(false)
    }
  }

  function handlePointerMove(event) {
    const node = shellRef.current
    if (!node) return
    node.style.setProperty("--pointer-x", `${event.clientX}px`)
    node.style.setProperty("--pointer-y", `${event.clientY}px`)
  }

  function goToView(viewKey) {
    setActiveView(viewKey)
    window.history.pushState(null, "", `#${viewKey}`)
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function openModal(type, item = null) {
    setModal({ type, item, mode: item ? "edit" : "create" })
    if (type === "record") setRecordForm(item ? { ...emptyRecord(hasPartner), ...item } : emptyRecord(hasPartner))
    if (type === "anniversary") setAnniversaryForm(item ? { ...emptyAnniversary(hasPartner), ...item } : emptyAnniversary(hasPartner))
    if (type === "mood") setMoodForm(item ? { ...emptyMood(hasPartner), ...item } : emptyMood(hasPartner))
    if (type === "wish") setWishForm(item ? { ...emptyWish(hasPartner), ...item } : emptyWish(hasPartner))
    if (type === "letter") setLetterForm(item ? { ...emptyLetter(hasPartner), ...item } : emptyLetter(hasPartner))
  }

  async function saveEntity(event, collection, payload, invalidMessage) {
    event.preventDefault()
    if (invalidMessage) {
      setNotice(invalidMessage)
      return
    }

    const isEdit = modal?.mode === "edit" && modal.item?.id
    const path = isEdit ? `/api/${collection}/${modal.item.id}` : `/api/${collection}`
    const method = isEdit ? "PUT" : "POST"

    try {
      await apiJson(path, { method, body: JSON.stringify(payload) })
      setModal(null)
      await reloadAll()
      setNotice(isEdit ? "已保存修改" : "已新增")
    } catch (error) {
      setNotice(error.message || "保存失败")
    }
  }

  async function deleteItem(collection, id) {
    if (!window.confirm("确定删除这条内容吗？")) return
    try {
      await apiJson(`/api/${collection}/${id}`, { method: "DELETE" })
      await reloadAll()
      setNotice("已删除")
    } catch (error) {
      setNotice(error.message || "删除失败")
    }
  }

  async function toggleWish(wish) {
    try {
      await apiJson(`/api/wishes/${wish.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...wish, completed: !wish.completed }),
      })
      await reloadAll()
    } catch (error) {
      setNotice(error.message || "更新愿望失败")
    }
  }

  async function logout() {
    await apiJson("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => null)
    setSession({ user: null, partner: null, pendingReceived: [], pendingSent: [] })
    setRecords([])
    setAnniversaries([])
    setMoods([])
    setTodayMood({ mine: null, partner: null })
    setWishes([])
    setLetters([])
    setStats(emptyStats)
    setAuthMode("login")
  }

  async function saveProfile(event) {
    event.preventDefault()
    try {
      const user = await apiJson("/api/profile", {
        method: "PUT",
        body: JSON.stringify(profileForm),
      })
      setSession((current) => ({ ...current, user }))
      setNotice("资料已保存")
    } catch (error) {
      setNotice(error.message || "保存资料失败")
    }
  }

  async function handleProfileImage(file) {
    if (!file) return
    try {
      const dataUrl = await compressImage(file, 520, 0.8)
      setProfileForm((current) => ({ ...current, avatar_url: dataUrl }))
    } catch (error) {
      setNotice(error.message)
    }
  }

  const content = (
    <>
      <TopBar
        activeView={activeView}
        user={session.user}
        partner={session.partner}
        dataLoading={dataLoading}
        onGo={goToView}
        onCreate={() => openModal("record")}
      />

      <main className="app-main" ref={mainRef}>
        {notice && <div className="toast glass-panel">{notice}</div>}

        {activeView === "home" && (
          <HomeView
            user={session.user}
            partner={session.partner}
            pendingReceived={session.pendingReceived}
            pendingSent={session.pendingSent}
            records={records}
            anniversaries={anniversaries}
            moods={moods}
            todayMood={todayMood}
            wishes={wishes}
            letters={letters}
            stats={stats}
            onGo={goToView}
            onCreate={openModal}
            onReload={reloadAll}
            onNotice={setNotice}
          />
        )}

        {activeView === "records" && (
          <RecordsView
            records={records}
            user={session.user}
            onCreate={() => openModal("record")}
            onEdit={(item) => openModal("record", item)}
            onDelete={(id) => deleteItem("records", id)}
            onChanged={reloadAll}
            onNotice={setNotice}
          />
        )}

        {activeView === "moods" && (
          <MoodsView
            moods={moods}
            todayMood={todayMood}
            user={session.user}
            partner={session.partner}
            onCreate={() => openModal("mood")}
            onEdit={(item) => openModal("mood", item)}
            onDelete={(id) => deleteItem("moods", id)}
          />
        )}

        {activeView === "anniversaries" && (
          <AnniversariesView
            anniversaries={anniversaries}
            user={session.user}
            onCreate={() => openModal("anniversary")}
            onEdit={(item) => openModal("anniversary", item)}
            onDelete={(id) => deleteItem("anniversaries", id)}
          />
        )}

        {activeView === "wishes" && (
          <WishesView
            wishes={wishes}
            user={session.user}
            onCreate={() => openModal("wish")}
            onEdit={(item) => openModal("wish", item)}
            onToggle={toggleWish}
            onDelete={(id) => deleteItem("wishes", id)}
          />
        )}

        {activeView === "letters" && (
          <LettersView
            letters={letters}
            user={session.user}
            onCreate={() => openModal("letter")}
            onEdit={(item) => openModal("letter", item)}
            onDelete={(id) => deleteItem("letters", id)}
          />
        )}

        {activeView === "photos" && (
          <PhotosView records={records} user={session.user} onGo={goToView} onCreate={() => openModal("record")} />
        )}

        {activeView === "settings" && (
          <SettingsView
            user={session.user}
            partner={session.partner}
            pendingReceived={session.pendingReceived}
            pendingSent={session.pendingSent}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            onProfileImage={handleProfileImage}
            onSaveProfile={saveProfile}
            onReload={reloadAll}
            onNotice={setNotice}
            onLogout={logout}
          />
        )}
      </main>

      {modal && (
        <EntityModal
          modal={modal}
          hasPartner={hasPartner}
          recordForm={recordForm}
          setRecordForm={setRecordForm}
          anniversaryForm={anniversaryForm}
          setAnniversaryForm={setAnniversaryForm}
          moodForm={moodForm}
          setMoodForm={setMoodForm}
          wishForm={wishForm}
          setWishForm={setWishForm}
          letterForm={letterForm}
          setLetterForm={setLetterForm}
          onClose={() => setModal(null)}
          onNotice={setNotice}
          onSaveRecord={(event) =>
            saveEntity(
              event,
              "records",
              {
                ...recordForm,
                title: recordForm.title.trim(),
                content: recordForm.content.trim(),
                location: recordForm.location.trim(),
                tags: recordForm.tags.trim(),
              },
              recordForm.title.trim() ? "" : "标题不能为空",
            )
          }
          onSaveAnniversary={(event) =>
            saveEntity(
              event,
              "anniversaries",
              {
                ...anniversaryForm,
                name: anniversaryForm.name.trim(),
                icon: anniversaryForm.icon.trim() || "♥",
              },
              anniversaryForm.name.trim() && anniversaryForm.date ? "" : "名称和日期不能为空",
            )
          }
          onSaveMood={(event) =>
            saveEntity(
              event,
              "moods",
              {
                ...moodForm,
                mood: moodForm.mood.trim(),
                mood_text: moodForm.mood_text.trim(),
                note: moodForm.note.trim(),
              },
              moodForm.date && moodForm.mood.trim() ? "" : "日期和心情不能为空",
            )
          }
          onSaveWish={(event) =>
            saveEntity(
              event,
              "wishes",
              {
                ...wishForm,
                content: wishForm.content.trim(),
                completed: Boolean(wishForm.completed),
              },
              wishForm.content.trim() ? "" : "愿望不能为空",
            )
          }
          onSaveLetter={(event) =>
            saveEntity(
              event,
              "letters",
              {
                ...letterForm,
                title: letterForm.title.trim(),
                content: letterForm.content.trim(),
              },
              letterForm.title.trim() && letterForm.content.trim() ? "" : "标题和内容不能为空",
            )
          }
        />
      )}
    </>
  )

  return (
    <div ref={shellRef} className="app-shell" onPointerMove={handlePointerMove}>
      <div className="scene-bg" aria-hidden="true" />
      <div className="light-trace" aria-hidden="true" />
      <div className="texture-layer" aria-hidden="true" />
      {booting ? (
        <BootScreen />
      ) : session.user ? (
        content
      ) : (
        <AuthScreen mode={authMode} setMode={setAuthMode} error={authError} setError={setAuthError} onReady={reloadAll} />
      )}
    </div>
  )
}

function BootScreen() {
  return (
    <div className="boot-screen">
      <div className="glass-panel boot-card">
        <span className="brand-dot">♥</span>
        <strong>正在进入情侣空间</strong>
        <small>同步登录状态</small>
      </div>
    </div>
  )
}

function AuthScreen({ mode, setMode, error, setError, onReady }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    nickname: "",
    inviteCode: "",
  })
  const [loading, setLoading] = useState(false)

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError("")

    if (mode === "register" && form.password !== form.confirmPassword) {
      setError("两次密码不一致")
      return
    }

    setLoading(true)
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login"
      const body =
        mode === "register"
          ? {
              username: form.username,
              nickname: form.nickname,
              password: form.password,
              inviteCode: form.inviteCode,
            }
          : {
              username: form.username,
              password: form.password,
            }
      await apiJson(path, { method: "POST", body: JSON.stringify(body) })
      await onReady()
    } catch (submitError) {
      setError(submitError.message || "操作失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-copy glass-panel">
        <span className="brand-dot">♥</span>
        <h1>只给两个人看的恋爱日记</h1>
        <p>登录后才能访问内容。注册需要邀请码，绑定后才可以互相查看共享记录。</p>
      </section>

      <section className="auth-card glass-panel">
        <div className="segmented">
          <button className={mode === "login" ? "is-active" : ""} type="button" onClick={() => setMode("login")}>
            登录
          </button>
          <button className={mode === "register" ? "is-active" : ""} type="button" onClick={() => setMode("register")}>
            注册
          </button>
        </div>

        <form className="form-stack" onSubmit={submit}>
          <Field label="账号">
            <input value={form.username} onChange={(event) => update("username", event.target.value)} autoComplete="username" />
          </Field>

          {mode === "register" && (
            <Field label="昵称">
              <input value={form.nickname} onChange={(event) => update("nickname", event.target.value)} autoComplete="nickname" />
            </Field>
          )}

          <Field label="密码">
            <input
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </Field>

          {mode === "register" && (
            <>
              <Field label="确认密码">
                <input
                  value={form.confirmPassword}
                  onChange={(event) => update("confirmPassword", event.target.value)}
                  type="password"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="邀请码">
                <input value={form.inviteCode} onChange={(event) => update("inviteCode", event.target.value)} />
              </Field>
            </>
          )}

          {error && <p className="form-error">{error}</p>}

          <button className="primary-action full" type="submit" disabled={loading}>
            {loading ? "处理中" : mode === "register" ? "创建账号" : "进入空间"}
          </button>
        </form>
      </section>
    </main>
  )
}

function TopBar({ activeView, user, partner, dataLoading, onGo, onCreate }) {
  return (
    <header className="topbar glass-panel">
      <button className="brand-button" type="button" onClick={() => onGo("home")}>
        <span className="brand-dot">♥</span>
        <span>情侣空间</span>
      </button>
      <nav className="nav-tabs" aria-label="主导航">
        {views.map((view) => (
          <button
            key={view.key}
            className={activeView === view.key ? "nav-tab is-active" : "nav-tab"}
            type="button"
            aria-current={activeView === view.key ? "page" : undefined}
            onClick={() => onGo(view.key)}
          >
            {view.label}
          </button>
        ))}
      </nav>
      <button className="primary-action top-action" type="button" onClick={onCreate}>
        写一段
      </button>
      <div className="avatar-pair" title={partner ? `已绑定：${partner.nickname}` : "未绑定"}>
        <img src={user?.avatar_url || "/avatar.jpg"} alt={user?.nickname || "我"} />
        {partner && <img src={partner.avatar_url || "/avatar.jpg"} alt={partner.nickname || "伴侣"} />}
      </div>
      {dataLoading && <span className="sync-pill">同步中</span>}
    </header>
  )
}

function HomeView({
  user,
  partner,
  pendingReceived,
  pendingSent,
  records,
  anniversaries,
  moods,
  todayMood,
  wishes,
  letters,
  stats,
  onGo,
  onCreate,
  onReload,
  onNotice,
}) {
  const nextAnniversary = useMemo(() => {
    return anniversaries
      .map((item) => ({ ...item, timing: getAnniversaryTiming(item.date) }))
      .sort((a, b) => a.timing.daysUntil - b.timing.daysUntil)[0]
  }, [anniversaries])
  const latestRecords = records.slice(0, 4)
  const openWishes = wishes.filter((wish) => !wish.completed).slice(0, 4)
  const photoCount = records.filter((record) => record.photo_url).length

  return (
    <div className="home-grid">
      <section className="hero-panel glass-panel">
        <span className="eyebrow">Private couple space</span>
        <h1>{partner ? `${user.nickname} 和 ${partner.nickname} 的小宇宙` : `${user.nickname} 的恋爱空间`}</h1>
        <p>所有内容都来自 Neon 数据库。私密内容只属于自己，共享内容只给绑定的那个人看。</p>
        <div className="hero-actions">
          <button className="primary-action" type="button" onClick={() => onCreate("record")}>
            新增日常
          </button>
          <button className="ghost-action" type="button" onClick={() => onGo("settings")}>
            绑定设置
          </button>
        </div>
      </section>

      <BindingPanel
        user={user}
        partner={partner}
        pendingReceived={pendingReceived}
        pendingSent={pendingSent}
        onReload={onReload}
        onNotice={onNotice}
      />

      <MetricCard label="记录" value={stats.totalRecords || 0} detail={`照片 ${photoCount} 张`} />
      <MetricCard label="心情" value={stats.totalMoods || 0} detail={`本月 ${moods.length} 条`} />
      <MetricCard label="愿望" value={`${stats.completedWishes || 0}/${stats.totalWishes || 0}`} detail="完成进度" />
      <MetricCard label="信件" value={stats.totalLetters || 0} detail="给彼此的话" />

      <section className="glass-panel today-panel">
        <SectionHead title="今日心情" action="记录心情" onAction={() => onCreate("mood")} />
        <div className="mood-pair">
          <MoodChip title="我的心情" item={todayMood.mine} fallback="今天还没记录" />
          <MoodChip title={partner ? `${partner.nickname} 的心情` : "伴侣心情"} item={todayMood.partner} fallback="暂无共享心情" />
        </div>
      </section>

      <section className="glass-panel countdown-panel">
        <SectionHead title="最近纪念日" action="管理" onAction={() => onGo("anniversaries")} />
        {nextAnniversary ? (
          <div className="countdown-body">
            <strong>{nextAnniversary.timing.label}</strong>
            <h2>{nextAnniversary.name}</h2>
            <p>
              {formatFullDate(nextAnniversary.timing.nextDate)}，第 {nextAnniversary.timing.yearCount} 周年
            </p>
          </div>
        ) : (
          <EmptyState title="还没有纪念日" text="新增后会显示真实倒计时。" />
        )}
      </section>

      <section className="glass-panel list-panel">
        <SectionHead title="最近日常" action="查看" onAction={() => onGo("records")} />
        {latestRecords.length ? (
          <div className="compact-list">
            {latestRecords.map((record) => (
              <button key={record.id} type="button" onClick={() => onGo("records")}>
                <span>{formatDate(record.date)}</span>
                <strong>{record.title}</strong>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="还没有日常" text="新增后会出现在这里。" />
        )}
      </section>

      <section className="glass-panel list-panel">
        <SectionHead title="未完成愿望" action="查看" onAction={() => onGo("wishes")} />
        {openWishes.length ? (
          <div className="compact-list">
            {openWishes.map((wish) => (
              <button key={wish.id} type="button" onClick={() => onGo("wishes")}>
                <span>{priorityLabels[wish.priority] || "愿望"}</span>
                <strong>{wish.content}</strong>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无未完成愿望" text="愿望清单是空的。" />
        )}
      </section>

      <section className="glass-panel letter-preview">
        <SectionHead title="最近信件" action="写信" onAction={() => onCreate("letter")} />
        {letters[0] ? (
          <>
            <h2>{letters[0].title}</h2>
            <p>{letters[0].content}</p>
          </>
        ) : (
          <EmptyState title="还没有信件" text="写下第一封信后会展示在这里。" />
        )}
      </section>
    </div>
  )
}

function BindingPanel({ user, partner, pendingReceived, pendingSent, onReload, onNotice }) {
  const [bindCode, setBindCode] = useState("")
  const [loading, setLoading] = useState(false)

  async function requestBind(event) {
    event.preventDefault()
    if (!bindCode.trim()) {
      onNotice("请输入绑定码")
      return
    }
    setLoading(true)
    try {
      await apiJson("/api/couple/request", { method: "POST", body: JSON.stringify({ bindCode }) })
      setBindCode("")
      await onReload()
      onNotice("绑定申请已发送")
    } catch (error) {
      onNotice(error.message || "发送失败")
    } finally {
      setLoading(false)
    }
  }

  async function accept(requestId) {
    try {
      await apiJson("/api/couple/accept", { method: "POST", body: JSON.stringify({ requestId }) })
      await onReload()
      onNotice("已绑定")
    } catch (error) {
      onNotice(error.message || "同意失败")
    }
  }

  async function reject(requestId) {
    try {
      await apiJson("/api/couple/reject", { method: "POST", body: JSON.stringify({ requestId }) })
      await onReload()
      onNotice("已拒绝")
    } catch (error) {
      onNotice(error.message || "拒绝失败")
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(user.bind_code)
      onNotice("绑定码已复制")
    } catch {
      onNotice("绑定码：" + user.bind_code)
    }
  }

  if (partner) {
    return (
      <section className="glass-panel bind-panel">
        <SectionHead title="已绑定" action="设置" />
        <div className="partner-card">
          <img src={partner.avatar_url || "/avatar.jpg"} alt={partner.nickname || "伴侣"} />
          <div>
            <strong>{partner.nickname || partner.username}</strong>
            <span>@{partner.username}</span>
          </div>
        </div>
        <p>共享内容会在对方空间中出现，私密内容只对自己可见。</p>
      </section>
    )
  }

  return (
    <section className="glass-panel bind-panel">
      <SectionHead title="情侣绑定" action="复制我的码" onAction={copyCode} />
      <div className="bind-code">
        <span>我的绑定码</span>
        <strong>{user.bind_code}</strong>
      </div>
      <form className="inline-form" onSubmit={requestBind}>
        <input value={bindCode} onChange={(event) => setBindCode(event.target.value)} placeholder="输入对方绑定码" />
        <button className="primary-action compact" type="submit" disabled={loading}>
          发送
        </button>
      </form>
      {!!pendingReceived.length && (
        <div className="request-list">
          {pendingReceived.map((request) => (
            <div key={request.id}>
              <span>{request.requester?.nickname || request.nickname || "对方"} 想绑定</span>
              <button type="button" onClick={() => accept(request.id)}>
                同意
              </button>
              <button type="button" onClick={() => reject(request.id)}>
                拒绝
              </button>
            </div>
          ))}
        </div>
      )}
      {!!pendingSent.length && <p className="muted">已发送 {pendingSent.length} 个待处理申请。</p>}
    </section>
  )
}

function RecordsView({ records, user, onCreate, onEdit, onDelete, onChanged, onNotice }) {
  const [search, setSearch] = useState("")
  const [type, setType] = useState("all")
  const [owner, setOwner] = useState("all")
  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return records
      .filter((record) => (type === "all" ? true : record.type === type))
      .filter((record) => (owner === "mine" ? isMine(record, user) : owner === "partner" ? !isMine(record, user) : true))
      .filter((record) => {
        if (!keyword) return true
        return [record.title, record.content, record.location, record.tags, authorName(record)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      })
  }, [records, type, owner, search, user])

  return (
    <section className="view-section">
      <ViewHeader title="日常记录" description="自己的记录可编辑删除，伴侣共享记录只读可评论。" action="新增记录" onAction={onCreate} />
      <div className="toolbar glass-panel">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题、地点或标签" />
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">全部类型</option>
          {Object.entries(recordTypes).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select value={owner} onChange={(event) => setOwner(event.target.value)}>
          <option value="all">全部可见</option>
          <option value="mine">我写的</option>
          <option value="partner">对方共享</option>
        </select>
      </div>

      {filteredRecords.length ? (
        <div className="record-list">
          {filteredRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              user={user}
              onEdit={onEdit}
              onDelete={onDelete}
              onChanged={onChanged}
              onNotice={onNotice}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="暂无日常记录" text="新增后会直接写入数据库。" action="新增记录" onAction={onCreate} />
      )}
    </section>
  )
}

function RecordCard({ record, user, onEdit, onDelete, onChanged, onNotice }) {
  const canEdit = isMine(record, user)

  return (
    <article className="record-card glass-panel">
      {record.photo_url && (
        <div className="record-photo">
          <img src={record.photo_url} alt={record.title} />
        </div>
      )}
      <div className="record-content">
        <div className="record-topline">
          <span>{formatDate(record.date)}</span>
          <span>{recordTypes[record.type] || record.type}</span>
          <span>{record.visibility === "shared" ? "共享" : "私密"}</span>
          <span>{authorName(record)}</span>
        </div>
        <h2>{record.title}</h2>
        <p>{record.content || "暂无正文"}</p>
        <div className="meta-row">
          {record.location && <span>{record.location}</span>}
          {record.mood && <span>{record.mood}</span>}
          {(record.tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 4)
            .map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
        </div>
        <div className="card-actions">
          {canEdit && (
            <>
              <button className="secondary-action compact" type="button" onClick={() => onEdit(record)}>
                编辑
              </button>
              <button className="danger-action compact" type="button" onClick={() => onDelete(record.id)}>
                删除
              </button>
            </>
          )}
        </div>
        <CommentsPanel record={record} user={user} onChanged={onChanged} onNotice={onNotice} />
      </div>
    </article>
  )
}

function CommentsPanel({ record, user, onChanged, onNotice }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const canComment = record.visibility === "shared"

  async function loadComments() {
    setLoading(true)
    try {
      const rows = await apiJson(`/api/comments?recordId=${record.id}`)
      setComments(Array.isArray(rows) ? rows : [])
    } catch (error) {
      onNotice(error.message || "读取评论失败")
    } finally {
      setLoading(false)
    }
  }

  async function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next) await loadComments()
  }

  async function submit(event) {
    event.preventDefault()
    if (!text.trim()) return
    try {
      await apiJson("/api/comments", {
        method: "POST",
        body: JSON.stringify({ recordId: record.id, content: text.trim() }),
      })
      setText("")
      await loadComments()
      await onChanged()
    } catch (error) {
      onNotice(error.message || "评论失败")
    }
  }

  async function remove(commentId) {
    try {
      await apiJson(`/api/comments/${commentId}`, { method: "DELETE" })
      await loadComments()
      await onChanged()
    } catch (error) {
      onNotice(error.message || "删除评论失败")
    }
  }

  return (
    <div className="comments-area">
      <button className="text-button" type="button" onClick={toggleOpen}>
        {open ? "收起评论" : `评论 ${record.comment_count || 0}`}
      </button>
      {open && (
        <div className="comments-box">
          {loading ? (
            <span className="muted">加载中</span>
          ) : comments.length ? (
            comments.map((comment) => (
              <div className="comment-row" key={comment.id}>
                <img src={comment.author_avatar || "/avatar.jpg"} alt={comment.author_nickname || "评论者"} />
                <div>
                  <strong>{comment.author_nickname || comment.author_username}</strong>
                  <p>{comment.content}</p>
                </div>
                {(comment.user_id === user.id || record.user_id === user.id) && (
                  <button type="button" onClick={() => remove(comment.id)}>
                    删除
                  </button>
                )}
              </div>
            ))
          ) : (
            <span className="muted">暂无评论</span>
          )}

          {canComment ? (
            <form className="comment-form" onSubmit={submit}>
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="写一条评论" />
              <button className="primary-action compact" type="submit">
                发送
              </button>
            </form>
          ) : (
            <span className="muted">私密记录不能评论。</span>
          )}
        </div>
      )}
    </div>
  )
}

function MoodsView({ moods, todayMood, user, partner, onCreate, onEdit, onDelete }) {
  const calendar = useMemo(() => buildMoodCalendar(moods), [moods])

  return (
    <section className="view-section">
      <ViewHeader title="心情记录" description="同一天重复保存会更新为最新心情。" action="记录今天" onAction={onCreate} />
      <div className="mood-board">
        <div className="glass-panel mood-calendar">
          <div className="calendar-grid">
            {calendar.map((day, index) => (
              <div
                key={`${day.label}-${index}`}
                className={day.header ? "calendar-cell is-header" : day.mood ? "calendar-cell has-mood" : "calendar-cell"}
                style={{ "--mood-tone": day.mood ? getMoodTone(day.mood) : 1 }}
              >
                {day.label}
              </div>
            ))}
          </div>
        </div>
        <div className="mood-side">
          <MoodChip title="我的今天" item={todayMood.mine} fallback="还没记录" />
          <MoodChip title={partner ? `${partner.nickname} 的今天` : "伴侣今天"} item={todayMood.partner} fallback="暂无共享心情" />
        </div>
      </div>

      {moods.length ? (
        <div className="card-grid two">
          {moods.map((mood) => (
            <article className="glass-panel mood-note" key={mood.id}>
              <span>{formatDate(mood.date)}</span>
              <h2>{mood.mood}</h2>
              <p>{mood.mood_text || mood.note || "暂无备注"}</p>
              {mood.note && mood.mood_text && <small>{mood.note}</small>}
              <div className="record-topline">
                <span>{authorName(mood)}</span>
                <span>{mood.visibility === "shared" ? "共享" : "私密"}</span>
              </div>
              {isMine(mood, user) && (
                <div className="card-actions">
                  <button className="secondary-action compact" type="button" onClick={() => onEdit(mood)}>
                    编辑
                  </button>
                  <button className="danger-action compact" type="button" onClick={() => onDelete(mood.id)}>
                    删除
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无心情" text="记录今天后会显示在这里。" action="新增心情" onAction={onCreate} />
      )}
    </section>
  )
}

function AnniversariesView({ anniversaries, user, onCreate, onEdit, onDelete }) {
  return (
    <section className="view-section">
      <ViewHeader title="纪念日" description="倒计时按当前日期实时计算。" action="新增纪念日" onAction={onCreate} />
      {anniversaries.length ? (
        <div className="card-grid three">
          {anniversaries.map((item) => {
            const timing = getAnniversaryTiming(item.date)
            return (
              <article className="glass-panel anniversary-card" key={item.id}>
                <span className="anniversary-mark">{item.icon || "♥"}</span>
                <h2>{item.name}</h2>
                <p>{formatFullDate(item.date)}</p>
                <strong>{timing.label}</strong>
                <small>
                  下次 {formatFullDate(timing.nextDate)}，已过 {timing.passedDays} 天
                </small>
                <div className="record-topline">
                  <span>{authorName(item)}</span>
                  <span>{item.visibility === "shared" ? "共享" : "私密"}</span>
                </div>
                {isMine(item, user) && (
                  <div className="card-actions">
                    <button className="secondary-action compact" type="button" onClick={() => onEdit(item)}>
                      编辑
                    </button>
                    <button className="danger-action compact" type="button" onClick={() => onDelete(item.id)}>
                      删除
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState title="暂无纪念日" text="新增后会得到真实倒计时。" action="新增纪念日" onAction={onCreate} />
      )}
    </section>
  )
}

function WishesView({ wishes, user, onCreate, onEdit, onToggle, onDelete }) {
  return (
    <section className="view-section">
      <ViewHeader title="愿望清单" description="愿望可以切换完成状态，也可以设置私密或共享。" action="新增愿望" onAction={onCreate} />
      {wishes.length ? (
        <div className="card-grid two">
          {wishes.map((wish) => (
            <article className={wish.completed ? "glass-panel wish-card is-done" : "glass-panel wish-card"} key={wish.id}>
              <button className="check-button" type="button" onClick={() => isMine(wish, user) && onToggle(wish)} disabled={!isMine(wish, user)}>
                {wish.completed ? "✓" : ""}
              </button>
              <div>
                <span>{priorityLabels[wish.priority] || "愿望"}</span>
                <h2>{wish.content}</h2>
                {wish.target_date && <p>目标 {formatFullDate(wish.target_date)}</p>}
                <div className="record-topline">
                  <span>{authorName(wish)}</span>
                  <span>{wish.visibility === "shared" ? "共享" : "私密"}</span>
                </div>
              </div>
              {isMine(wish, user) && (
                <div className="card-actions">
                  <button className="secondary-action compact" type="button" onClick={() => onEdit(wish)}>
                    编辑
                  </button>
                  <button className="danger-action compact" type="button" onClick={() => onDelete(wish.id)}>
                    删除
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无愿望" text="新增愿望后会显示在这里。" action="新增愿望" onAction={onCreate} />
      )}
    </section>
  )
}

function LettersView({ letters, user, onCreate, onEdit, onDelete }) {
  return (
    <section className="view-section">
      <ViewHeader title="信件" description="写给对方或写给自己的话都会保存到数据库。" action="写一封信" onAction={onCreate} />
      {letters.length ? (
        <div className="card-grid two">
          {letters.map((letter) => (
            <article className="glass-panel letter-card" key={letter.id}>
              <span>{letter.visible_on ? formatFullDate(letter.visible_on) : "未设日期"}</span>
              <h2>{letter.title}</h2>
              <p>{letter.content}</p>
              <div className="record-topline">
                <span>{authorName(letter)}</span>
                <span>{letter.visibility === "shared" ? "共享" : "私密"}</span>
              </div>
              {isMine(letter, user) && (
                <div className="card-actions">
                  <button className="secondary-action compact" type="button" onClick={() => onEdit(letter)}>
                    编辑
                  </button>
                  <button className="danger-action compact" type="button" onClick={() => onDelete(letter.id)}>
                    删除
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无信件" text="写一封信后会出现在这里。" action="写信" onAction={onCreate} />
      )}
    </section>
  )
}

function PhotosView({ records, user, onGo, onCreate }) {
  const photos = records.filter((record) => record.photo_url)

  return (
    <section className="view-section">
      <ViewHeader title="照片墙" description="照片来自日常记录的压缩图片字段。" action="上传照片" onAction={onCreate} />
      {photos.length ? (
        <div className="photo-wall">
          {photos.map((record) => (
            <button className="photo-tile glass-panel" key={record.id} type="button" onClick={() => onGo("records")}>
              <img src={record.photo_url} alt={record.title} />
              <span>{formatDate(record.date)}</span>
              <strong>{record.title}</strong>
              <small>{isMine(record, user) ? "我上传" : `${authorName(record)} 共享`}</small>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无照片" text="在日常记录中上传图片后会显示。" action="新增记录" onAction={onCreate} />
      )}
    </section>
  )
}

function SettingsView({
  user,
  partner,
  pendingReceived,
  pendingSent,
  profileForm,
  setProfileForm,
  onProfileImage,
  onSaveProfile,
  onReload,
  onNotice,
  onLogout,
}) {
  const [bindCode, setBindCode] = useState("")

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }))
  }

  async function requestBind(event) {
    event.preventDefault()
    try {
      await apiJson("/api/couple/request", { method: "POST", body: JSON.stringify({ bindCode }) })
      setBindCode("")
      await onReload()
      onNotice("绑定申请已发送")
    } catch (error) {
      onNotice(error.message || "发送失败")
    }
  }

  async function respond(path, requestId, message) {
    try {
      await apiJson(path, { method: "POST", body: JSON.stringify({ requestId }) })
      await onReload()
      onNotice(message)
    } catch (error) {
      onNotice(error.message || "操作失败")
    }
  }

  async function unbind() {
    if (!window.confirm("确定解除绑定吗？")) return
    try {
      await apiJson("/api/couple/unbind", { method: "POST", body: "{}" })
      await onReload()
      onNotice("已解除绑定")
    } catch (error) {
      onNotice(error.message || "解除绑定失败")
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(user.bind_code)
      onNotice("绑定码已复制")
    } catch {
      onNotice("绑定码：" + user.bind_code)
    }
  }

  return (
    <section className="view-section">
      <ViewHeader title="设置" description="管理个人资料、绑定关系和退出登录。" />
      <div className="settings-grid">
        <form className="glass-panel settings-card form-stack" onSubmit={onSaveProfile}>
          <h2>个人资料</h2>
          <div className="profile-row">
            <img src={profileForm.avatar_url || "/avatar.jpg"} alt={profileForm.nickname || "头像"} />
            <label className="file-button">
              更换头像
              <input type="file" accept="image/*" onChange={(event) => onProfileImage(event.target.files?.[0])} />
            </label>
          </div>
          <Field label="昵称">
            <input value={profileForm.nickname} onChange={(event) => updateProfile("nickname", event.target.value)} />
          </Field>
          <button className="primary-action full" type="submit">
            保存资料
          </button>
        </form>

        <section className="glass-panel settings-card">
          <h2>绑定关系</h2>
          <div className="bind-code settings-code">
            <span>我的绑定码</span>
            <strong>{user.bind_code}</strong>
            <button className="secondary-action compact" type="button" onClick={copyCode}>
              复制
            </button>
          </div>
          {partner ? (
            <>
              <div className="partner-card">
                <img src={partner.avatar_url || "/avatar.jpg"} alt={partner.nickname || "伴侣"} />
                <div>
                  <strong>{partner.nickname || partner.username}</strong>
                  <span>@{partner.username}</span>
                </div>
              </div>
              <button className="danger-action" type="button" onClick={unbind}>
                解除绑定
              </button>
            </>
          ) : (
            <form className="inline-form" onSubmit={requestBind}>
              <input value={bindCode} onChange={(event) => setBindCode(event.target.value)} placeholder="输入对方绑定码" />
              <button className="primary-action compact" type="submit">
                发送申请
              </button>
            </form>
          )}
          {!!pendingReceived.length && (
            <div className="request-list">
              {pendingReceived.map((request) => (
                <div key={request.id}>
                  <span>{request.requester?.nickname || request.nickname || "对方"} 想绑定</span>
                  <button type="button" onClick={() => respond("/api/couple/accept", request.id, "已同意绑定")}>
                    同意
                  </button>
                  <button type="button" onClick={() => respond("/api/couple/reject", request.id, "已拒绝")}>
                    拒绝
                  </button>
                </div>
              ))}
            </div>
          )}
          {!!pendingSent.length && <p className="muted">已发送 {pendingSent.length} 个申请，等待对方处理。</p>}
        </section>

        <section className="glass-panel settings-card">
          <h2>账号</h2>
          <p className="muted">退出后需要重新登录才能访问内部内容。</p>
          <button className="danger-action" type="button" onClick={onLogout}>
            退出登录
          </button>
        </section>
      </div>
    </section>
  )
}

function EntityModal({
  modal,
  hasPartner,
  recordForm,
  setRecordForm,
  anniversaryForm,
  setAnniversaryForm,
  moodForm,
  setMoodForm,
  wishForm,
  setWishForm,
  letterForm,
  setLetterForm,
  onClose,
  onNotice,
  onSaveRecord,
  onSaveAnniversary,
  onSaveMood,
  onSaveWish,
  onSaveLetter,
}) {
  const titleMap = {
    record: modal.mode === "edit" ? "编辑日常" : "新增日常",
    anniversary: modal.mode === "edit" ? "编辑纪念日" : "新增纪念日",
    mood: modal.mode === "edit" ? "编辑心情" : "记录心情",
    wish: modal.mode === "edit" ? "编辑愿望" : "新增愿望",
    letter: modal.mode === "edit" ? "编辑信件" : "写一封信",
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-panel glass-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{titleMap[modal.type]}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {modal.type === "record" && (
          <RecordForm
            value={recordForm}
            setValue={setRecordForm}
            hasPartner={hasPartner}
            onSubmit={onSaveRecord}
            mode={modal.mode}
            onNotice={onNotice}
          />
        )}
        {modal.type === "anniversary" && (
          <AnniversaryForm value={anniversaryForm} setValue={setAnniversaryForm} hasPartner={hasPartner} onSubmit={onSaveAnniversary} mode={modal.mode} />
        )}
        {modal.type === "mood" && <MoodForm value={moodForm} setValue={setMoodForm} hasPartner={hasPartner} onSubmit={onSaveMood} mode={modal.mode} />}
        {modal.type === "wish" && <WishForm value={wishForm} setValue={setWishForm} hasPartner={hasPartner} onSubmit={onSaveWish} mode={modal.mode} />}
        {modal.type === "letter" && <LetterForm value={letterForm} setValue={setLetterForm} hasPartner={hasPartner} onSubmit={onSaveLetter} mode={modal.mode} />}
      </section>
    </div>
  )
}

function RecordForm({ value, setValue, hasPartner, onSubmit, mode, onNotice }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))

  async function handlePhoto(file) {
    if (!file) return
    try {
      const dataUrl = await compressImage(file)
      update("photo_url", dataUrl)
    } catch (error) {
      onNotice(error.message || "图片处理失败")
    }
  }

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <div className="form-grid">
        <Field label="日期">
          <input type="date" value={value.date || ""} onChange={(event) => update("date", event.target.value)} />
        </Field>
        <Field label="类型">
          <select value={value.type || "daily"} onChange={(event) => update("type", event.target.value)}>
            {Object.entries(recordTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="标题">
        <input value={value.title || ""} onChange={(event) => update("title", event.target.value)} />
      </Field>
      <Field label="内容">
        <textarea value={value.content || ""} onChange={(event) => update("content", event.target.value)} rows={5} />
      </Field>
      <div className="form-grid">
        <Field label="地点">
          <input value={value.location || ""} onChange={(event) => update("location", event.target.value)} />
        </Field>
        <Field label="心情">
          <select value={value.mood || "开心"} onChange={(event) => update("mood", event.target.value)}>
            {moodOptions.map((mood) => (
              <option key={mood.value} value={mood.value}>
                {mood.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="标签">
        <input value={value.tags || ""} onChange={(event) => update("tags", event.target.value)} placeholder="用逗号分隔" />
      </Field>
      <Field label="照片">
        <input type="file" accept="image/*" onChange={(event) => handlePhoto(event.target.files?.[0])} />
      </Field>
      {value.photo_url && (
        <div className="image-preview">
          <img src={value.photo_url} alt="预览" />
          <button className="secondary-action compact" type="button" onClick={() => update("photo_url", "")}>
            移除照片
          </button>
        </div>
      )}
      <VisibilityField value={value.visibility} onChange={(next) => update("visibility", next)} hasPartner={hasPartner} />
      <label className="check-line">
        <input type="checkbox" checked={Boolean(value.is_favorite)} onChange={(event) => update("is_favorite", event.target.checked)} />
        <span>设为珍藏回忆</span>
      </label>
      <FormActions mode={mode} />
    </form>
  )
}

function AnniversaryForm({ value, setValue, hasPartner, onSubmit, mode }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <Field label="名称">
        <input value={value.name || ""} onChange={(event) => update("name", event.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="日期">
          <input type="date" value={value.date || ""} onChange={(event) => update("date", event.target.value)} />
        </Field>
        <Field label="标记">
          <input value={value.icon || ""} maxLength={2} onChange={(event) => update("icon", event.target.value)} />
        </Field>
      </div>
      <VisibilityField value={value.visibility} onChange={(next) => update("visibility", next)} hasPartner={hasPartner} />
      <FormActions mode={mode} />
    </form>
  )
}

function MoodForm({ value, setValue, hasPartner, onSubmit, mode }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <div className="form-grid">
        <Field label="日期">
          <input type="date" value={value.date || ""} onChange={(event) => update("date", event.target.value)} />
        </Field>
        <Field label="心情">
          <select value={value.mood || "开心"} onChange={(event) => update("mood", event.target.value)}>
            {moodOptions.map((mood) => (
              <option key={mood.value} value={mood.value}>
                {mood.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="一句话">
        <input value={value.mood_text || ""} onChange={(event) => update("mood_text", event.target.value)} />
      </Field>
      <Field label="备注">
        <textarea value={value.note || ""} onChange={(event) => update("note", event.target.value)} rows={4} />
      </Field>
      <VisibilityField value={value.visibility} onChange={(next) => update("visibility", next)} hasPartner={hasPartner} />
      <FormActions mode={mode} />
    </form>
  )
}

function WishForm({ value, setValue, hasPartner, onSubmit, mode }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <Field label="愿望">
        <input value={value.content || ""} onChange={(event) => update("content", event.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="优先级">
          <select value={value.priority || "medium"} onChange={(event) => update("priority", event.target.value)}>
            {Object.entries(priorityLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="目标日期">
          <input type="date" value={value.target_date || ""} onChange={(event) => update("target_date", event.target.value)} />
        </Field>
      </div>
      <VisibilityField value={value.visibility} onChange={(next) => update("visibility", next)} hasPartner={hasPartner} />
      <label className="check-line">
        <input type="checkbox" checked={Boolean(value.completed)} onChange={(event) => update("completed", event.target.checked)} />
        <span>已完成</span>
      </label>
      <FormActions mode={mode} />
    </form>
  )
}

function LetterForm({ value, setValue, hasPartner, onSubmit, mode }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <Field label="标题">
        <input value={value.title || ""} onChange={(event) => update("title", event.target.value)} />
      </Field>
      <Field label="内容">
        <textarea value={value.content || ""} onChange={(event) => update("content", event.target.value)} rows={7} />
      </Field>
      <Field label="日期">
        <input type="date" value={value.visible_on || ""} onChange={(event) => update("visible_on", event.target.value)} />
      </Field>
      <VisibilityField value={value.visibility} onChange={(next) => update("visibility", next)} hasPartner={hasPartner} />
      <FormActions mode={mode} />
    </form>
  )
}

function VisibilityField({ value, onChange, hasPartner }) {
  return (
    <Field label="可见范围">
      <select value={hasPartner ? value || "shared" : "private"} onChange={(event) => onChange(event.target.value)} disabled={!hasPartner}>
        <option value="private">仅自己可见</option>
        <option value="shared">情侣共享</option>
      </select>
    </Field>
  )
}

function FormActions({ mode }) {
  return (
    <div className="form-actions">
      <button className="primary-action" type="submit">
        {mode === "edit" ? "保存修改" : "新增保存"}
      </button>
    </div>
  )
}

function ViewHeader({ title, description, action, onAction }) {
  return (
    <div className="view-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <button className="primary-action" type="button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

function SectionHead({ title, action, onAction }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action && (
        <button type="button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

function MetricCard({ label, value, detail }) {
  return (
    <section className="glass-panel metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  )
}

function MoodChip({ title, item, fallback }) {
  return (
    <div className="mood-chip">
      <span>{title}</span>
      <strong>{item?.mood || fallback}</strong>
      <p>{item?.mood_text || item?.note || ""}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function EmptyState({ title, text, action, onAction }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
      {action && (
        <button className="secondary-action compact" type="button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

function buildMoodCalendar(moods) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const headers = ["日", "一", "二", "三", "四", "五", "六"].map((label) => ({ label, header: true }))
  const blanks = Array.from({ length: firstDay }, (_, index) => ({ label: "", blank: index }))
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const match = moods.find((mood) => mood.date === date)
    return { label: day, mood: match?.mood }
  })
  return [...headers, ...blanks, ...days]
}
