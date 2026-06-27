"use client"

import { useEffect, useMemo, useRef, useState } from "react"

const DAY = 24 * 60 * 60 * 1000

const views = [
  { key: "home", label: "首页" },
  { key: "timeline", label: "时光" },
  { key: "anniversaries", label: "纪念日" },
  { key: "mood", label: "心情" },
  { key: "wishes", label: "愿望" },
  { key: "letters", label: "情书" },
]

const recordTypes = {
  all: "全部",
  daily: "日常",
  date: "约会",
  travel: "旅行",
  special: "特别",
}

const moodLabels = {
  1: "低落",
  2: "想念",
  3: "平稳",
  4: "开心",
  5: "心动",
}

const priorityLabels = {
  high: "优先",
  medium: "普通",
  low: "以后",
}

const emptyStats = {
  daysTogether: 0,
  totalRecords: 0,
  favoriteRecords: 0,
  totalMoods: 0,
  totalWishes: 0,
  completedWishes: 0,
  avgMood: "-",
  anniversaries: 0,
  totalLetters: 0,
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptyRecord() {
  return {
    date: todayISO(),
    type: "date",
    title: "",
    content: "",
    location: "",
    mood: 4,
    photo_url: "",
    tags: "",
    is_favorite: false,
  }
}

function emptyAnniversary() {
  return { name: "", date: todayISO(), icon: "♥" }
}

function emptyMood() {
  return { date: todayISO(), mood: 4, note: "" }
}

function emptyWish() {
  return { content: "", priority: "medium", target_date: "" }
}

function emptyLetter() {
  return { title: "", content: "", visible_on: todayISO() }
}

async function apiJson(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "请求失败")
  return data
}

function formatDate(dateString) {
  if (!dateString) return "未设置"
  const date = new Date(`${dateString}T00:00:00`)
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date)
}

function clampDate(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function getAnniversaryTiming(dateString) {
  const original = clampDate(new Date(`${dateString}T00:00:00`))
  const today = clampDate(new Date())
  const passedDays = Math.floor((today.getTime() - original.getTime()) / DAY) + 1

  let nextDate = new Date(today.getFullYear(), original.getMonth(), original.getDate())
  if (nextDate < today) {
    nextDate = new Date(today.getFullYear() + 1, original.getMonth(), original.getDate())
  }
  if (original > today) {
    nextDate = original
  }

  const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / DAY)
  const yearCount = Math.max(0, nextDate.getFullYear() - original.getFullYear())

  return {
    passedDays: Math.max(0, passedDays),
    daysUntil,
    nextDate: nextDate.toISOString().slice(0, 10),
    yearCount,
    countdownText: daysUntil === 0 ? "今天" : `${daysUntil} 天`,
  }
}

export default function App() {
  const shellRef = useRef(null)
  const workspaceRef = useRef(null)
  const [activeView, setActiveView] = useState("home")
  const [records, setRecords] = useState([])
  const [anniversaries, setAnniversaries] = useState([])
  const [moods, setMoods] = useState([])
  const [wishes, setWishes] = useState([])
  const [letters, setLetters] = useState([])
  const [stats, setStats] = useState(emptyStats)
  const [dataMode, setDataMode] = useState("checking")
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const [recordForm, setRecordForm] = useState(emptyRecord)
  const [anniversaryForm, setAnniversaryForm] = useState(emptyAnniversary)
  const [moodForm, setMoodForm] = useState(emptyMood)
  const [wishForm, setWishForm] = useState(emptyWish)
  const [letterForm, setLetterForm] = useState(emptyLetter)

  useEffect(() => {
    const hash = window.location.hash.replace("#", "")
    if (views.some((view) => view.key === hash)) setActiveView(hash)
    loadData()

    const onHashChange = () => {
      const nextHash = window.location.hash.replace("#", "")
      if (views.some((view) => view.key === nextHash)) setActiveView(nextHash)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(""), 3600)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function loadData() {
    setLoading(true)
    try {
      const health = await apiJson("/api/health")
      if (!health.database) {
        setDataMode("offline")
        setRecords([])
        setAnniversaries([])
        setMoods([])
        setWishes([])
        setLetters([])
        setStats(emptyStats)
        setNotice("未连接 Neon，请先配置 DATABASE_URL")
        return
      }

      const [nextRecords, nextAnniversaries, nextMoods, nextWishes, nextLetters, nextStats] = await Promise.all([
        apiJson("/api/records"),
        apiJson("/api/anniversaries"),
        apiJson("/api/moods"),
        apiJson("/api/wishes"),
        apiJson("/api/letters"),
        apiJson("/api/stats"),
      ])

      setRecords(Array.isArray(nextRecords) ? nextRecords : [])
      setAnniversaries(Array.isArray(nextAnniversaries) ? nextAnniversaries : [])
      setMoods(Array.isArray(nextMoods) ? nextMoods : [])
      setWishes(Array.isArray(nextWishes) ? nextWishes : [])
      setLetters(Array.isArray(nextLetters) ? nextLetters : [])
      setStats(nextStats || emptyStats)
      setDataMode("live")
    } catch (error) {
      console.error(error)
      setDataMode("offline")
      setNotice(error.message || "数据库连接失败")
    } finally {
      setLoading(false)
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
      const target = viewKey === "home" ? document.querySelector(".hero-section") : workspaceRef.current
      target?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function ensureLive() {
    if (dataMode === "live") return true
    setNotice("还没有连接数据库，配置 Neon DATABASE_URL 后才能保存")
    return false
  }

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return records
      .filter((record) => (typeFilter === "all" ? true : record.type === typeFilter))
      .filter((record) => {
        if (!keyword) return true
        return [record.title, record.content, record.location, record.tags]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      })
      .sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`))
  }, [records, search, typeFilter])

  const featuredRecord = records.find((record) => record.is_favorite) || records[0]
  const latestLetter = letters[0]
  const openWishes = wishes.filter((wish) => !wish.completed)

  function openCreate(type) {
    setModal({ type, mode: "create", item: null })
    if (type === "record") setRecordForm(emptyRecord())
    if (type === "anniversary") setAnniversaryForm(emptyAnniversary())
    if (type === "mood") setMoodForm(emptyMood())
    if (type === "wish") setWishForm(emptyWish())
    if (type === "letter") setLetterForm(emptyLetter())
  }

  function openEdit(type, item) {
    setModal({ type, mode: "edit", item })
    if (type === "record") setRecordForm({ ...emptyRecord(), ...item, is_favorite: Boolean(item.is_favorite) })
    if (type === "anniversary") setAnniversaryForm({ ...emptyAnniversary(), ...item })
    if (type === "mood") setMoodForm({ ...emptyMood(), ...item })
    if (type === "wish") setWishForm({ ...emptyWish(), ...item })
    if (type === "letter") setLetterForm({ ...emptyLetter(), ...item })
  }

  function closeModal() {
    setModal(null)
  }

  async function saveEntity(event, collection, payload, requiredMessage) {
    event.preventDefault()
    if (requiredMessage) {
      setNotice(requiredMessage)
      return
    }
    if (!ensureLive()) return

    const isEdit = modal?.mode === "edit" && modal.item?.id
    const path = isEdit ? `/api/${collection}/${modal.item.id}` : `/api/${collection}`
    const method = isEdit ? "PUT" : "POST"

    try {
      await apiJson(path, { method, body: JSON.stringify(payload) })
      closeModal()
      await loadData()
      setNotice(isEdit ? "修改已保存" : "新增已保存")
    } catch (error) {
      console.error(error)
      setNotice(error.message || "保存失败")
    }
  }

  async function saveRecord(event) {
    const payload = {
      ...recordForm,
      title: recordForm.title.trim(),
      content: recordForm.content.trim(),
      location: recordForm.location.trim(),
      tags: recordForm.tags.trim(),
      mood: Number(recordForm.mood || 3),
      is_favorite: Boolean(recordForm.is_favorite),
    }
    await saveEntity(event, "records", payload, payload.title ? "" : "标题不能为空")
  }

  async function saveAnniversary(event) {
    const payload = {
      ...anniversaryForm,
      name: anniversaryForm.name.trim(),
      icon: anniversaryForm.icon.trim() || "♥",
    }
    await saveEntity(event, "anniversaries", payload, payload.name && payload.date ? "" : "纪念日名称和日期不能为空")
  }

  async function saveMood(event) {
    const payload = {
      ...moodForm,
      mood: Number(moodForm.mood || 3),
      note: moodForm.note.trim(),
    }
    await saveEntity(event, "moods", payload, payload.date ? "" : "日期不能为空")
  }

  async function saveWish(event) {
    const payload = {
      ...wishForm,
      content: wishForm.content.trim(),
      completed: Boolean(wishForm.completed),
    }
    await saveEntity(event, "wishes", payload, payload.content ? "" : "愿望不能为空")
  }

  async function saveLetter(event) {
    const payload = {
      ...letterForm,
      title: letterForm.title.trim(),
      content: letterForm.content.trim(),
    }
    await saveEntity(event, "letters", payload, payload.title && payload.content ? "" : "情书标题和内容不能为空")
  }

  async function deleteItem(collection, id) {
    if (!ensureLive()) return
    if (!window.confirm("确定删除这条内容吗？")) return

    try {
      await apiJson(`/api/${collection}/${id}`, { method: "DELETE" })
      await loadData()
      setNotice("已删除")
    } catch (error) {
      console.error(error)
      setNotice(error.message || "删除失败")
    }
  }

  async function toggleWish(wish) {
    if (!ensureLive()) return
    try {
      await apiJson(`/api/wishes/${wish.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...wish, completed: !wish.completed }),
      })
      await loadData()
    } catch (error) {
      console.error(error)
      setNotice(error.message || "更新愿望失败")
    }
  }

  return (
    <div ref={shellRef} className="app-shell" data-theme="rose" onPointerMove={handlePointerMove}>
      <div className="scene-bg" aria-hidden="true" />
      <div className="grain-layer" aria-hidden="true" />

      <header className="topbar glass-panel">
        <button className="brand-mark" type="button" onClick={() => goToView("home")}>
          <span className="brand-glyph">♥</span>
          <span>恋爱日记</span>
        </button>

        <nav className="nav-tabs" aria-label="主导航">
          {views.map((view) => (
            <button
              key={view.key}
              className={activeView === view.key ? "nav-tab is-active" : "nav-tab"}
              type="button"
              aria-current={activeView === view.key ? "page" : undefined}
              onClick={() => goToView(view.key)}
            >
              {view.label}
            </button>
          ))}
        </nav>

        <button className="primary-action" type="button" onClick={() => openCreate("record")}>
          <span>＋</span>
          写一段
        </button>
      </header>

      <main className="page-main">
        <Hero
          stats={stats}
          featuredRecord={featuredRecord}
          dataMode={dataMode}
          onCreate={() => openCreate("record")}
          onJump={goToView}
        />

        <section className="workspace glass-panel" ref={workspaceRef} id={activeView}>
          <WorkspaceHeader activeView={activeView} loading={loading} dataMode={dataMode} notice={notice} />
          {dataMode === "offline" && <DatabaseRequired />}

          {activeView === "home" && (
            <Overview
              records={records}
              wishes={openWishes}
              letters={letters}
              moods={moods}
              stats={stats}
              featuredRecord={featuredRecord}
              latestLetter={latestLetter}
              onOpen={goToView}
              onCreate={openCreate}
            />
          )}

          {activeView === "timeline" && (
            <TimelineView
              records={filteredRecords}
              search={search}
              setSearch={setSearch}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              onCreate={() => openCreate("record")}
              onEdit={(item) => openEdit("record", item)}
              onDelete={(id) => deleteItem("records", id)}
            />
          )}

          {activeView === "anniversaries" && (
            <AnniversaryView
              anniversaries={anniversaries}
              onCreate={() => openCreate("anniversary")}
              onEdit={(item) => openEdit("anniversary", item)}
              onDelete={(id) => deleteItem("anniversaries", id)}
            />
          )}

          {activeView === "mood" && (
            <MoodView
              moods={moods}
              onCreate={() => openCreate("mood")}
              onEdit={(item) => openEdit("mood", item)}
              onDelete={(id) => deleteItem("moods", id)}
            />
          )}

          {activeView === "wishes" && (
            <WishView
              wishes={wishes}
              onCreate={() => openCreate("wish")}
              onEdit={(item) => openEdit("wish", item)}
              onToggle={toggleWish}
              onDelete={(id) => deleteItem("wishes", id)}
            />
          )}

          {activeView === "letters" && (
            <LetterView
              letters={letters}
              onCreate={() => openCreate("letter")}
              onEdit={(item) => openEdit("letter", item)}
              onDelete={(id) => deleteItem("letters", id)}
            />
          )}
        </section>
      </main>

      {modal?.type === "record" && (
        <Modal title={modal.mode === "edit" ? "编辑时光" : "新增时光"} onClose={closeModal}>
          <RecordForm value={recordForm} setValue={setRecordForm} onSubmit={saveRecord} mode={modal.mode} />
        </Modal>
      )}

      {modal?.type === "anniversary" && (
        <Modal title={modal.mode === "edit" ? "编辑纪念日" : "新增纪念日"} onClose={closeModal}>
          <AnniversaryForm value={anniversaryForm} setValue={setAnniversaryForm} onSubmit={saveAnniversary} mode={modal.mode} />
        </Modal>
      )}

      {modal?.type === "mood" && (
        <Modal title={modal.mode === "edit" ? "编辑心情" : "新增心情"} onClose={closeModal}>
          <MoodForm value={moodForm} setValue={setMoodForm} onSubmit={saveMood} mode={modal.mode} />
        </Modal>
      )}

      {modal?.type === "wish" && (
        <Modal title={modal.mode === "edit" ? "编辑愿望" : "新增愿望"} onClose={closeModal}>
          <WishForm value={wishForm} setValue={setWishForm} onSubmit={saveWish} mode={modal.mode} />
        </Modal>
      )}

      {modal?.type === "letter" && (
        <Modal title={modal.mode === "edit" ? "编辑情书" : "新增情书"} onClose={closeModal}>
          <LetterForm value={letterForm} setValue={setLetterForm} onSubmit={saveLetter} mode={modal.mode} />
        </Modal>
      )}
    </div>
  )
}

function Hero({ stats, featuredRecord, dataMode, onCreate, onJump }) {
  return (
    <section className="hero-section">
      <div className="hero-copy">
        <p className="kicker">LOVE JOURNAL DATABASE</p>
        <h1>把每一天都写进同一个地方</h1>
        <p className="hero-subtitle">内容从 Neon 数据库读取，可新增、编辑、删除。纪念日倒计时按真实日期自动计算。</p>
        <div className="hero-actions">
          <button className="primary-action hero-button" type="button" onClick={onCreate}>
            <span>＋</span>
            新增记录
          </button>
          <button className="ghost-action hero-button" type="button" onClick={() => onJump("anniversaries")}>
            查看倒计时
          </button>
        </div>
      </div>

      <div className="hero-memory glass-panel">
        <div className="memory-photo" />
        <div className="memory-copy">
          <span>{dataMode === "live" ? "Neon 已连接" : "数据库未连接"}</span>
          <h2>{featuredRecord?.title || "还没有数据库记录"}</h2>
          <p>{featuredRecord?.content || "连接 Neon 后，在时光模块新增第一条内容，这里会自动展示最新回忆。"}</p>
        </div>
        <div className="hero-stat-row">
          <MiniStat label="记录天数" value={`${stats.daysTogether || 0} 天`} />
          <MiniStat label="回忆" value={stats.totalRecords || 0} />
          <MiniStat label="愿望" value={`${stats.completedWishes || 0}/${stats.totalWishes || 0}`} />
        </div>
      </div>
    </section>
  )
}

function WorkspaceHeader({ activeView, loading, dataMode, notice }) {
  const titleMap = {
    home: "数据总览",
    timeline: "时光记录",
    anniversaries: "真实倒计时",
    mood: "心情记录",
    wishes: "愿望清单",
    letters: "情书盒子",
  }

  return (
    <div className="workspace-header">
      <div>
        <p className="section-label">DATABASE CONTENT</p>
        <h2>{titleMap[activeView]}</h2>
      </div>
      <div className="status-stack">
        {loading && <span className="status-pill">同步中</span>}
        <span className={dataMode === "live" ? "status-pill is-live" : "status-pill"}>{dataMode === "live" ? "云端已连接" : "未连接"}</span>
        {notice && <span className="notice-pill">{notice}</span>}
      </div>
    </div>
  )
}

function DatabaseRequired() {
  return (
    <div className="db-required glass-card">
      <strong>当前没有连接数据库</strong>
      <p>请在 Vercel 或本地 `.env.local` 配置 `DATABASE_URL`。连接 Neon 后，本页会自动建表，所有内容都从数据库读取。</p>
    </div>
  )
}

function Overview({ records, wishes, moods, stats, featuredRecord, latestLetter, onOpen, onCreate }) {
  const recentRecords = records.slice(0, 3)
  const moodAverage = stats.avgMood === "-" ? "暂无" : `${stats.avgMood}/5`

  return (
    <div className="overview-grid">
      <button className="overview-tile wide glass-card align-start" type="button" onClick={() => onOpen("timeline")}>
        <span className="tile-meta">最新记录</span>
        <h3>{featuredRecord?.title || "暂无记录"}</h3>
        <p>{featuredRecord?.content || "点击新增，把第一段内容写入数据库。"}</p>
        {featuredRecord?.tags && (
          <div className="tag-row">
            {featuredRecord.tags.split(",").filter(Boolean).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </button>

      <button className="overview-tile tall glass-card" type="button" onClick={() => onOpen("letters")}>
        <span className="tile-meta">最新情书</span>
        <h3>{latestLetter?.title || "暂无情书"}</h3>
        <p>{latestLetter?.content || "写下内容后会从数据库同步显示。"}</p>
      </button>

      <div className="overview-tile glass-card stat-cluster">
        <MiniStat label="记录天数" value={`${stats.daysTogether || 0} 天`} />
        <MiniStat label="心情均值" value={moodAverage} />
        <MiniStat label="珍藏回忆" value={stats.favoriteRecords || 0} />
        <MiniStat label="小情书" value={stats.totalLetters || 0} />
      </div>

      <button className="overview-tile glass-card" type="button" onClick={() => onOpen("wishes")}>
        <span className="tile-meta">待完成愿望</span>
        <h3>{wishes[0]?.content || "暂无愿望"}</h3>
        <p>{wishes[0]?.target_date ? `目标日期：${formatDate(wishes[0].target_date)}` : "新增愿望后会出现在这里。"}</p>
      </button>

      <div className="overview-tile wide glass-card">
        <span className="tile-meta">最近三段</span>
        {recentRecords.length ? (
          <div className="mini-timeline">
            {recentRecords.map((record) => (
              <button key={record.id} type="button" onClick={() => onOpen("timeline")}>
                <span>{formatDate(record.date)}</span>
                <strong>{record.title}</strong>
              </button>
            ))}
          </div>
        ) : (
          <button className="text-link" type="button" onClick={() => onCreate("record")}>
            新增第一条时光记录
          </button>
        )}
      </div>

      <div className="overview-tile glass-card mood-strip-card">
        <span className="tile-meta">心情走势</span>
        {moods.length ? (
          <div className="mood-strip">
            {moods.slice(0, 9).reverse().map((mood) => (
              <span key={`${mood.date}-${mood.id}`} style={{ "--mood": mood.mood }} title={moodLabels[mood.mood]} />
            ))}
          </div>
        ) : (
          <p>暂无心情记录。</p>
        )}
        <button className="text-link" type="button" onClick={() => onCreate("mood")}>
          记录今天
        </button>
      </div>
    </div>
  )
}

function TimelineView({ records, search, setSearch, typeFilter, setTypeFilter, onCreate, onEdit, onDelete }) {
  return (
    <div className="view-stack">
      <div className="toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题、地点或标签" />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          {Object.entries(recordTypes).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button className="primary-action compact" type="button" onClick={onCreate}>
          ＋ 新记录
        </button>
      </div>

      {records.length ? (
        <div className="timeline-list">
          {records.map((record) => (
            <article className="record-card glass-card" key={record.id}>
              <div className="record-date">
                <span>{formatDate(record.date)}</span>
                <strong>{recordTypes[record.type] || record.type}</strong>
              </div>
              <div className="record-body">
                <div className="record-title-row">
                  <h3>{record.title}</h3>
                  {record.is_favorite && <span className="favorite-mark">♥</span>}
                </div>
                <p>{record.content || "暂无内容"}</p>
                <div className="record-meta">
                  {record.location && <span>{record.location}</span>}
                  <span>{moodLabels[record.mood] || "心情"}</span>
                  {(record.tags || "").split(",").filter(Boolean).slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="card-actions">
                <button className="secondary-action compact" type="button" onClick={() => onEdit(record)}>
                  编辑
                </button>
                <button className="danger-action compact" type="button" onClick={() => onDelete(record.id)}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无时光记录" action="点击「新记录」写入数据库。" />
      )}
    </div>
  )
}

function AnniversaryView({ anniversaries, onCreate, onEdit, onDelete }) {
  return (
    <div className="view-stack">
      <div className="view-action-row">
        <p>倒计时会按每个纪念日的下一个周年日期实时计算。</p>
        <button className="primary-action compact" type="button" onClick={onCreate}>
          ＋ 新纪念日
        </button>
      </div>
      {anniversaries.length ? (
        <div className="anniversary-grid">
          {anniversaries.map((item) => {
            const timing = getAnniversaryTiming(item.date)
            return (
              <article className="anniversary-card glass-card" key={item.id}>
                <span className="anniversary-icon">{item.icon || "♥"}</span>
                <h3>{item.name}</h3>
                <p>原始日期：{formatDate(item.date)}</p>
                <div className="anniversary-metrics">
                  <strong>{timing.countdownText}</strong>
                  <span>距离下次纪念日</span>
                  <small>下次：{formatDate(timing.nextDate)}，第 {timing.yearCount} 周年</small>
                  <small>已过：{timing.passedDays} 天</small>
                </div>
                <div className="card-actions inline">
                  <button className="secondary-action compact" type="button" onClick={() => onEdit(item)}>
                    编辑
                  </button>
                  <button className="danger-action compact" type="button" onClick={() => onDelete(item.id)}>
                    删除
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState title="暂无纪念日" action="新增后会显示真实倒计时。" />
      )}
    </div>
  )
}

function MoodView({ moods, onCreate, onEdit, onDelete }) {
  const calendar = useMemo(() => buildMoodCalendar(moods), [moods])

  return (
    <div className="mood-layout">
      <div className="calendar glass-card">
        <div className="view-action-row">
          <p>按日期记录心情，重复日期会更新为最新内容。</p>
          <button className="primary-action compact" type="button" onClick={onCreate}>
            ＋ 新心情
          </button>
        </div>
        <div className="calendar-grid">
          {calendar.map((day, index) => (
            <div
              key={`${day.label}-${index}`}
              className={day.header ? "calendar-cell is-header" : day.mood ? "calendar-cell has-mood" : "calendar-cell"}
              style={{ "--mood": day.mood || 1 }}
            >
              <span>{day.header || day.label ? day.label : ""}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mood-notes">
        {moods.length ? (
          moods.slice(0, 10).map((mood) => (
            <article className="mood-note glass-card" key={mood.id}>
              <span>{formatDate(mood.date)}</span>
              <strong>{moodLabels[mood.mood]}</strong>
              <p>{mood.note || "暂无备注"}</p>
              <div className="card-actions inline">
                <button className="secondary-action compact" type="button" onClick={() => onEdit(mood)}>
                  编辑
                </button>
                <button className="danger-action compact" type="button" onClick={() => onDelete(mood.id)}>
                  删除
                </button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="暂无心情记录" action="点击「新心情」写入数据库。" />
        )}
      </div>
    </div>
  )
}

function WishView({ wishes, onCreate, onEdit, onToggle, onDelete }) {
  return (
    <div className="view-stack">
      <div className="view-action-row">
        <p>愿望支持新增、编辑、完成状态切换和删除。</p>
        <button className="primary-action compact" type="button" onClick={onCreate}>
          ＋ 新愿望
        </button>
      </div>
      {wishes.length ? (
        <div className="wish-grid">
          {wishes.map((wish) => (
            <article className={wish.completed ? "wish-card glass-card is-done" : "wish-card glass-card"} key={wish.id}>
              <button className="check-button" type="button" onClick={() => onToggle(wish)} aria-label="切换愿望状态">
                {wish.completed ? "✓" : ""}
              </button>
              <div>
                <span>{priorityLabels[wish.priority] || "普通"}</span>
                <h3>{wish.content}</h3>
                {wish.target_date && <p>目标：{formatDate(wish.target_date)}</p>}
              </div>
              <div className="card-actions">
                <button className="secondary-action compact" type="button" onClick={() => onEdit(wish)}>
                  编辑
                </button>
                <button className="danger-action compact" type="button" onClick={() => onDelete(wish.id)}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无愿望" action="新增愿望后会保存到数据库。" />
      )}
    </div>
  )
}

function LetterView({ letters, onCreate, onEdit, onDelete }) {
  return (
    <div className="view-stack">
      <div className="view-action-row">
        <p>情书内容来自数据库，可随时修改或删除。</p>
        <button className="primary-action compact" type="button" onClick={onCreate}>
          ＋ 新情书
        </button>
      </div>
      {letters.length ? (
        <div className="letter-grid">
          {letters.map((letter) => (
            <article className="letter-card glass-card" key={letter.id}>
              <span>{letter.visible_on ? formatDate(letter.visible_on) : "未设置日期"}</span>
              <h3>{letter.title}</h3>
              <p>{letter.content}</p>
              <div className="card-actions inline">
                <button className="secondary-action compact" type="button" onClick={() => onEdit(letter)}>
                  编辑
                </button>
                <button className="danger-action compact" type="button" onClick={() => onDelete(letter.id)}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无情书" action="新增后会保存到数据库。" />
      )}
    </div>
  )
}

function RecordForm({ value, setValue, onSubmit, mode }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label>
          <span>日期</span>
          <input type="date" value={value.date || ""} onChange={(event) => update("date", event.target.value)} />
        </label>
        <label>
          <span>类型</span>
          <select value={value.type || "daily"} onChange={(event) => update("type", event.target.value)}>
            {Object.entries(recordTypes).filter(([key]) => key !== "all").map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>标题</span>
        <input value={value.title || ""} onChange={(event) => update("title", event.target.value)} placeholder="标题" />
      </label>
      <label>
        <span>内容</span>
        <textarea value={value.content || ""} onChange={(event) => update("content", event.target.value)} rows={5} placeholder="内容" />
      </label>
      <div className="form-grid">
        <label>
          <span>地点</span>
          <input value={value.location || ""} onChange={(event) => update("location", event.target.value)} placeholder="地点" />
        </label>
        <label>
          <span>心情</span>
          <select value={value.mood || 3} onChange={(event) => update("mood", Number(event.target.value))}>
            {Object.entries(moodLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>标签</span>
        <input value={value.tags || ""} onChange={(event) => update("tags", event.target.value)} placeholder="用英文逗号分隔" />
      </label>
      <label className="check-line">
        <input type="checkbox" checked={Boolean(value.is_favorite)} onChange={(event) => update("is_favorite", event.target.checked)} />
        <span>设为珍藏回忆</span>
      </label>
      <FormActions mode={mode} />
    </form>
  )
}

function AnniversaryForm({ value, setValue, onSubmit, mode }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>
        <span>名称</span>
        <input value={value.name || ""} onChange={(event) => update("name", event.target.value)} placeholder="纪念日名称" />
      </label>
      <div className="form-grid">
        <label>
          <span>日期</span>
          <input type="date" value={value.date || ""} onChange={(event) => update("date", event.target.value)} />
        </label>
        <label>
          <span>标记</span>
          <input value={value.icon || ""} maxLength={2} onChange={(event) => update("icon", event.target.value)} />
        </label>
      </div>
      <FormActions mode={mode} />
    </form>
  )
}

function MoodForm({ value, setValue, onSubmit, mode }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label>
          <span>日期</span>
          <input type="date" value={value.date || ""} onChange={(event) => update("date", event.target.value)} />
        </label>
        <label>
          <span>心情</span>
          <select value={value.mood || 3} onChange={(event) => update("mood", Number(event.target.value))}>
            {Object.entries(moodLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>备注</span>
        <textarea value={value.note || ""} onChange={(event) => update("note", event.target.value)} rows={4} placeholder="备注" />
      </label>
      <FormActions mode={mode} />
    </form>
  )
}

function WishForm({ value, setValue, onSubmit, mode }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>
        <span>愿望</span>
        <input value={value.content || ""} onChange={(event) => update("content", event.target.value)} placeholder="愿望内容" />
      </label>
      <div className="form-grid">
        <label>
          <span>优先级</span>
          <select value={value.priority || "medium"} onChange={(event) => update("priority", event.target.value)}>
            {Object.entries(priorityLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>目标日期</span>
          <input type="date" value={value.target_date || ""} onChange={(event) => update("target_date", event.target.value)} />
        </label>
      </div>
      <FormActions mode={mode} />
    </form>
  )
}

function LetterForm({ value, setValue, onSubmit, mode }) {
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }))
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>
        <span>标题</span>
        <input value={value.title || ""} onChange={(event) => update("title", event.target.value)} placeholder="标题" />
      </label>
      <label>
        <span>内容</span>
        <textarea value={value.content || ""} onChange={(event) => update("content", event.target.value)} rows={6} placeholder="内容" />
      </label>
      <label>
        <span>日期</span>
        <input type="date" value={value.visible_on || ""} onChange={(event) => update("visible_on", event.target.value)} />
      </label>
      <FormActions mode={mode} />
    </form>
  )
}

function FormActions({ mode }) {
  return (
    <div className="form-actions">
      <button className="primary-action compact" type="submit">
        {mode === "edit" ? "保存修改" : "新增保存"}
      </button>
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-panel glass-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭弹窗">
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function EmptyState({ title, action }) {
  return (
    <div className="empty-state glass-card">
      <strong>{title}</strong>
      <span>{action}</span>
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
