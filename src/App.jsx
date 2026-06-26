import { useState, useEffect } from 'react'

const THEMES = {
  pink: { primary: '#ff6b9d', bg: '#fff5f8', card: '#fff', text: '#3d2c35', border: '#ffe0eb', gradient: 'linear-gradient(135deg, #ff6b9d, #c44dff)', shadow: 'rgba(255,107,157,0.15)' },
  blue: { primary: '#5b9bd5', bg: '#f0f7ff', card: '#fff', text: '#2c3d50', border: '#d4e8f7', gradient: 'linear-gradient(135deg, #5b9bd5, #7dd3fc)', shadow: 'rgba(91,155,213,0.15)' },
  purple: { primary: '#a855f7', bg: '#faf5ff', card: '#fff', text: '#3b2050', border: '#e9d5ff', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', shadow: 'rgba(168,85,247,0.15)' },
  gold: { primary: '#d4a056', bg: '#fffaf0', card: '#fff', text: '#3d3020', border: '#f0dcc0', gradient: 'linear-gradient(135deg, #d4a056, #e8845a)', shadow: 'rgba(212,160,86,0.15)' },
}

const TYPE_LABELS = { date: '💕 约会', daily: '🏠 日常', special: '🎉 特别', travel: '✈️ 旅行' }
const MOOD_EMOJIS = ['', '😢', '😐', '🙂', '😊', '😍']
const PRI_LABELS = { high: '⭐ 重要', medium: '🌙 普通', low: '☁️ 慢慢来' }

async function apiCall(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(path, opts)
  return res.json()
}

export default function App() {
  const [tab, setTab] = useState('timeline')
  const [themeName, setThemeName] = useState(localStorage.getItem('lj-theme') || 'pink')
  const [partnerName, setPartnerName] = useState(localStorage.getItem('lj-name') || '')
  const [startDate, setStartDate] = useState(localStorage.getItem('lj-start') || '')
  const [records, setRecords] = useState([])
  const [anniversaries, setAnniversaries] = useState([])
  const [moods, setMoods] = useState([])
  const [wishes, setWishes] = useState([])
  const [stats, setStats] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [showRec, setShowRec] = useState(false)
  const [showAnn, setShowAnn] = useState(false)
  const [showMood, setShowMood] = useState(false)
  const [showWish, setShowWish] = useState(false)

  const [rf, setRf] = useState({ date: new Date().toISOString().split('T')[0], type: 'date', title: '', content: '', location: '', mood: 4 })
  const [af, setAf] = useState({ name: '', date: '', icon: '\u2764\uFE0F' })
  const [mf, setMf] = useState({ date: new Date().toISOString().split('T')[0], mood: 4, note: '' })
  const [wf, setWf] = useState({ content: '', priority: 'medium' })

  const ct = THEMES[themeName] || THEMES.pink

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [r, a, m, w, s] = await Promise.all([
        apiCall('GET', '/api/records'),
        apiCall('GET', '/api/anniversaries'),
        apiCall('GET', '/api/moods'),
        apiCall('GET', '/api/wishes'),
        apiCall('GET', '/api/stats'),
      ])
      setRecords(Array.isArray(r) ? r : [])
      setAnniversaries(Array.isArray(a) ? a : [])
      setMoods(Array.isArray(m) ? m : [])
      setWishes(Array.isArray(w) ? w : [])
      setStats(s || {})
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = records.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !(r.content || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const countdownItems = anniversaries.map(a => {
    const diff = Math.floor((Date.now() - new Date(a.date + 'T00:00:00').getTime()) / 86400000)
    const years = Math.floor(diff / 365), rem = diff % 365
    return { ...a, text: years > 0 ? years + ' 年 ' + rem + ' 天' : diff + ' 天' }
  }).sort((a, b) => a.date.localeCompare(b.date))

  const moodCalDays = (() => {
    const now = new Date(), year = now.getFullYear(), month = now.getMonth()
    const firstDay = new Date(year, month, 1).getDay(), dim = new Date(year, month + 1, 0).getDate()
    const wd = ['日', '一', '二', '三', '四', '五', '六']
    const result = wd.map(d => ({ label: d, isHeader: true }))
    for (let i = 0; i < firstDay; i++) result.push({ label: '' })
    for (let d = 1; d <= dim; d++) {
      const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
      const mr = moods.find(m => m.date === ds)
      result.push({ label: d, emoji: mr ? MOOD_EMOJIS[mr.mood] : '' })
    }
    return result
  })()

  async function saveRecord() {
    if (!rf.title) return alert('请填写标题')
    await apiCall('POST', '/api/records', rf)
    setShowRec(false)
    setRf({ date: new Date().toISOString().split('T')[0], type: 'date', title: '', content: '', location: '', mood: 4 })
    loadData()
  }

  async function deleteRecord(id) { if (!confirm('删除？')) return; await apiCall('DELETE', '/api/records/' + id); loadData() }
  async function saveAnniversary() { if (!af.name || !af.date) return alert('请填写完整'); await apiCall('POST', '/api/anniversaries', af); setShowAnn(false); setAf({ name: '', date: '', icon: '\u2764\uFE0F' }); loadData() }
  async function deleteAnniversary(id) { await apiCall('DELETE', '/api/anniversaries/' + id); loadData() }
  async function saveMood() { if (!mf.date) return alert('请选择日期'); await apiCall('POST', '/api/moods', mf); setShowMood(false); setMf({ date: new Date().toISOString().split('T')[0], mood: 4, note: '' }); loadData() }
  async function saveWish() { if (!wf.content) return alert('请填写愿望'); await apiCall('POST', '/api/wishes', wf); setShowWish(false); setWf({ content: '', priority: 'medium' }); loadData() }
  async function toggleWish(w) { await apiCall('PUT', '/api/wishes/' + w.id, { ...w, completed: !w.completed }); loadData() }
  async function deleteWish(id) { await apiCall('DELETE', '/api/wishes/' + id); loadData() }

  function setTheme(t) { setThemeName(t); localStorage.setItem('lj-theme', t) }
  function saveName() { localStorage.setItem('lj-name', partnerName) }
  function saveStart() { localStorage.setItem('lj-start', startDate); loadData() }

  async function exportData() {
    const [r, a, m, w, s] = await Promise.all([apiCall('GET', '/api/records'), apiCall('GET', '/api/anniversaries'), apiCall('GET', '/api/moods'), apiCall('GET', '/api/wishes'), apiCall('GET', '/api/stats')])
    const blob = new Blob([JSON.stringify({ records: r, anniversaries: a, moods: m, wishes: w, stats: s }, null, 2)])
    const el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = 'love-journal-' + new Date().toISOString().split('T')[0] + '.json'; el.click()
  }

  function fmtDate(ds) {
    const d = new Date(ds + 'T00:00:00')
    const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + wd[d.getDay()]
  }

  const gs = { '--p': ct.primary, '--bg': ct.bg, '--card': ct.card, '--text': ct.text, '--border': ct.border, '--grad': ct.gradient, '--sh': ct.shadow }

  return (
    <div style={{ ...gs, minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--card)', borderBottom: '2px solid var(--border)', boxShadow: '0 2px 20px var(--sh)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 1.2, fontWeight: 700, background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {partnerName ? '💕 ' + partnerName + ' 的' : '💕 '}恋爱日记
          </h1>
          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
            {['timeline', 'anniversaries', 'mood', 'wishes', 'stats', 'settings'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 14px', borderRadius: 20, border: 'none',
                background: tab === t ? 'var(--grad)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text)', opacity: tab === t ? 1 : 0.7,
                fontSize: 0.85, fontWeight: 500, cursor: 'pointer', transition: 'all 0.3s'
              }}>
                {{ timeline: '📅 时间线', anniversaries: '⏳ 纪念日', mood: '😊 心情', wishes: '🌟 愿望', stats: '📊 数据', settings: '⚙️ 设置' }[t]}
              </button>
            ))}
          </nav>
          <button onClick={() => setShowRec(true)} style={{ padding: '10px 20px', border: 'none', borderRadius: 25, background: 'var(--grad)', color: '#fff', fontSize: 0.9, fontWeight: 600, cursor: 'pointer' }}>＋ 添加</button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {tab === 'timeline' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ fontSize: 1.4, fontWeight: 700 }}>📅 每日时光</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..." style={{ padding: '8px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 0.85, background: 'var(--card)', color: 'var(--text)' }} />
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 0.85, background: 'var(--card)', color: 'var(--text)' }}>
                  <option value="all">全部</option>
                  <option value="date">💕 约会</option>
                  <option value="daily">🏠 日常</option>
                  <option value="special">🎉 特别</option>
                  <option value="travel">✈️ 旅行</option>
                </select>
              </div>
            </div>
            {loading ? <p style={{ textAlign: 'center', padding: 40 }}>加载中...</p> :
             filtered.length === 0 ? <p style={{ textAlign: 'center', padding: 60, opacity: 0.6 }}>还没有记录，点击「＋ 添加」开始书写 💑</p> :
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               {filtered.map(r => (
                 <div key={r.id} style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', borderLeft: '4px solid var(--p)', boxShadow: '0 4px 15px var(--sh)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                     <span style={{ fontSize: 0.75, fontWeight: 700, color: 'var(--p)' }}>{fmtDate(r.date)} · {TYPE_LABELS[r.type] || r.type}</span>
                     <button onClick={() => deleteRecord(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>🗑️</button>
                   </div>
                   <div style={{ fontSize: 1.05, fontWeight: 600, marginBottom: 6 }}>{r.title}</div>
                   {r.content && <div style={{ fontSize: 0.9, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 6 }}>{r.content}</div>}
                   {r.location && <div style={{ fontSize: 0.8, opacity: 0.7 }}>📍 {r.location}</div>}
                   {r.mood && <div style={{ fontSize: 1.2, marginTop: 6 }}>{MOOD_EMOJIS[r.mood]}</div>}
                 </div>
               ))}
             </div>
            }
          </div>
        )}

        {tab === 'anniversaries' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 1.4, fontWeight: 700 }}>⏳ 纪念日</h2>
              <button onClick={() => setShowAnn(true)} style={{ padding: '8px 16px', border: '2px solid var(--p)', borderRadius: 20, background: 'transparent', color: 'var(--p)', fontSize: 0.8, fontWeight: 600, cursor: 'pointer' }}>＋ 添加</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {countdownItems.map(a => (
                <div key={a.id} style={{ background: 'var(--card)', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 4px 15px var(--sh)', position: 'relative' }}>
                  <button onClick={() => deleteAnniversary(a.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  <div style={{ fontSize: 2.5, marginBottom: 8 }}>{a.icon}</div>
                  <div style={{ fontSize: 1.1, fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ fontSize: 0.8, opacity: 0.6, marginBottom: 12 }}>{fmtDate(a.date)}</div>
                  <div style={{ fontSize: 1.8, fontWeight: 700, background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{a.text}</div>
                  <div style={{ fontSize: 0.8, opacity: 0.6, marginTop: 4 }}>已经一起走过的日子</div>
                </div>
              ))}
              {countdownItems.length === 0 && <p style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>还没有纪念日 ⏳</p>}
            </div>
          </div>
        )}

        {tab === 'mood' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 1.4, fontWeight: 700 }}>😊 心情日记</h2>
              <button onClick={() => setShowMood(true)} style={{ padding: '8px 16px', border: '2px solid var(--p)', borderRadius: 20, background: 'transparent', color: 'var(--p)', fontSize: 0.8, fontWeight: 600, cursor: 'pointer' }}>＋ 记录</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 20 }}>
              {moodCalDays.map((d, i) => (
                <div key={i} style={{ aspectRatio: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 0.85, background: d.isHeader ? 'var(--p)' : 'var(--card)', color: d.isHeader ? '#fff' : 'var(--text)', border: d.isHeader ? 'none' : '1px solid var(--border)', position: 'relative', minWidth: 0 }}>
                  {d.label}
                  {d.emoji && <span style={{ position: 'absolute', bottom: 2, fontSize: 0.65 }}>{d.emoji}</span>}
                </div>
              ))}
            </div>
            {moods.slice(0, 10).map(m => (
              <div key={m.id} style={{ background: 'var(--card)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, boxShadow: '0 2px 8px var(--sh)' }}>
                <span style={{ fontSize: 0.8, opacity: 0.6, minWidth: 80 }}>{m.date}</span>
                <span style={{ fontSize: 1.3 }}>{MOOD_EMOJIS[m.mood]}</span>
                {m.note && <span style={{ fontSize: 0.85 }}>{m.note}</span>}
              </div>
            ))}
          </div>
        )}

        {tab === 'wishes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 1.4, fontWeight: 700 }}>🌟 愿望清单</h2>
              <button onClick={() => setShowWish(true)} style={{ padding: '8px 16px', border: '2px solid var(--p)', borderRadius: 20, background: 'transparent', color: 'var(--p)', fontSize: 0.8, fontWeight: 600, cursor: 'pointer' }}>＋ 添加</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wishes.map(w => (
                <div key={w.id} style={{ background: 'var(--card)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 10px var(--sh)', opacity: w.completed ? 0.5 : 1, textDecoration: w.completed ? 'line-through' : 'none' }}>
                  <div onClick={() => toggleWish(w)} style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--p)', cursor: 'pointer', flexShrink: 0, background: w.completed ? 'var(--p)' : 'transparent' }} />
                  <span style={{ flex: 1, fontSize: 0.95 }}>{w.content}</span>
                  <span style={{ fontSize: 0.7, padding: '2px 8px', borderRadius: 10, background: w.priority === 'high' ? '#ffe0e0' : w.priority === 'medium' ? '#fff3e0' : '#e8f5e9', color: w.priority === 'high' ? '#e74c3c' : w.priority === 'medium' ? '#f39c12' : '#27ae60' }}>{PRI_LABELS[w.priority]}</span>
                  <button onClick={() => deleteWish(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>✕</button>
                </div>
              ))}
              {wishes.length === 0 && <p style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>还没有愿望 🌟</p>}
            </div>
          </div>
        )}

        {tab === 'stats' && (
          <div>
            <h2 style={{ fontSize: 1.4, fontWeight: 700, marginBottom: 20 }}>📊 我们的数据</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
              {[
                { num: stats?.daysTogether || '-', label: '在一起的天数' },
                { num: stats?.totalRecords || 0, label: '记录总数' },
                { num: stats?.totalMoods || 0, label: '心情记录' },
                { num: stats?.completedWishes || 0 + '/' + stats?.totalWishes || 0, label: '愿望完成' },
                { num: stats?.avgMood || '-', label: '平均心情' },
                { num: anniversaries.length, label: '纪念日' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--card)', borderRadius: 16, padding: 24, textAlign: 'center', border: '2px solid var(--border)', boxShadow: '0 4px 15px var(--sh)' }}>
                  <div style={{ fontSize: 2.2, fontWeight: 700, background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.num}</div>
                  <div style={{ fontSize: 0.8, opacity: 0.6, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div>
            <h2 style={{ fontSize: 1.4, fontWeight: 700, marginBottom: 20 }}>⚙️ 设置</h2>
            <div style={{ background: 'var(--card)', borderRadius: 16, padding: 24, border: '2px solid var(--border)', boxShadow: '0 4px 15px var(--sh)', maxWidth: 500 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 0.9 }}>对方名字</label>
                <input value={partnerName} onChange={e => setPartnerName(e.target.value)} onBlur={saveName} placeholder="输入TA的名字" style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 0.9, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 0.9 }}>在一起的日子</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} onBlur={saveStart} style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 0.9, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 0.9 }}>主题颜色</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['pink', 'blue', 'purple', 'gold'].map(t => (
                    <button key={t} onClick={() => setTheme(t)} style={{
                      width: 44, height: 44, borderRadius: '50%', border: themeName === t ? '3px solid var(--text)' : '3px solid transparent',
                      background: THEMES[t].gradient, cursor: 'pointer', fontSize: 1.2, transition: 'transform 0.2s'
                    }}>{t === 'pink' ? '🩷' : t === 'blue' ? '🩵' : t === 'purple' ? '💜' : '🤎'}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 0.9 }}>数据管理</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={exportData} style={{ padding: '8px 16px', border: '2px solid var(--p)', borderRadius: 20, background: 'transparent', color: 'var(--p)', fontSize: 0.8, fontWeight: 600, cursor: 'pointer' }}>📤 导出数据</button>
                  <button onClick={() => { if (confirm('确定清除本地缓存？')) { localStorage.clear(); location.reload() } }} style={{ padding: '8px 16px', border: '2px solid #e74c3c', borderRadius: 20, background: 'transparent', color: '#e74c3c', fontSize: 0.8, fontWeight: 600, cursor: 'pointer' }}>🗑️ 清除缓存</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showRec && <Modal onClose={() => setShowRec(false)} title="✨ 添加记录" theme={ct}>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>日期</label><input type="date" value={rf.date} onChange={e => setRf({ ...rf, date: e.target.value })} /></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>类型</label><select value={rf.type} onChange={e => setRf({ ...rf, type: e.target.value })}><option value="date">💕 约会</option><option value="daily">🏠 日常</option><option value="special">🎉 特别时刻</option><option value="travel">✈️ 旅行</option></select></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>标题</label><input value={rf.title} onChange={e => setRf({ ...rf, title: e.target.value })} placeholder="今天发生了什么？" /></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>内容</label><textarea value={rf.content} onChange={e => setRf({ ...rf, content: e.target.value })} rows={4} placeholder="写下更多细节..." /></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>地点</label><input value={rf.location} onChange={e => setRf({ ...rf, location: e.target.value })} placeholder="在哪里？" /></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>心情</label><div style={{ display: 'flex', gap: 8 }}>{MOOD_EMOJIS.map((e, i) => i > 0 && <span key={i} onClick={() => setRf({ ...rf, mood: i })} style={{ fontSize: 1.6, cursor: 'pointer', padding: 4, borderRadius: 8, background: rf.mood === i ? 'var(--bg)' : 'transparent', border: rf.mood === i ? '2px solid var(--p)' : '2px solid transparent' }}>{e}</span>)}</div></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={() => setShowRec(false)} style={{ padding: '10px 24px', border: '2px solid var(--border)', borderRadius: 25, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>取消</button>
          <button onClick={saveRecord} style={{ padding: '10px 24px', border: 'none', borderRadius: 25, background: 'var(--grad)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>保存 💾</button>
        </div>
      </Modal>}

      {showAnn && <Modal onClose={() => setShowAnn(false)} title="🎂 添加纪念日" theme={ct}>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>名称</label><input value={af.name} onChange={e => setAf({ ...af, name: e.target.value })} placeholder="例如：第一次见面" /></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>日期</label><input type="date" value={af.date} onChange={e => setAf({ ...af, date: e.target.value })} /></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>图标</label><input value={af.icon} onChange={e => setAf({ ...af, icon: e.target.value })} maxLength={4} /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={() => setShowAnn(false)} style={{ padding: '10px 24px', border: '2px solid var(--border)', borderRadius: 25, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>取消</button>
          <button onClick={saveAnniversary} style={{ padding: '10px 24px', border: 'none', borderRadius: 25, background: 'var(--grad)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>保存 💾</button>
        </div>
      </Modal>}

      {showMood && <Modal onClose={() => setShowMood(false)} title="😊 记录心情" theme={ct}>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>日期</label><input type="date" value={mf.date} onChange={e => setMf({ ...mf, date: e.target.value })} /></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>心情</label><div style={{ display: 'flex', gap: 8 }}>{MOOD_EMOJIS.map((e, i) => i > 0 && <span key={i} onClick={() => setMf({ ...mf, mood: i })} style={{ fontSize: 2.2, cursor: 'pointer', padding: 6, borderRadius: 12, background: mf.mood === i ? 'var(--bg)' : 'transparent', border: mf.mood === i ? '2px solid var(--p)' : '2px solid transparent' }}>{e}</span>)}</div></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>想说的话</label><textarea value={mf.note} onChange={e => setMf({ ...mf, note: e.target.value })} rows={3} placeholder="今天过得怎么样？" /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={() => setShowMood(false)} style={{ padding: '10px 24px', border: '2px solid var(--border)', borderRadius: 25, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>取消</button>
          <button onClick={saveMood} style={{ padding: '10px 24px', border: 'none', borderRadius: 25, background: 'var(--grad)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>保存 💾</button>
        </div>
      </Modal>}

      {showWish && <Modal onClose={() => setShowWish(false)} title="🌟 添加愿望" theme={ct}>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>愿望</label><input value={wf.content} onChange={e => setWf({ ...wf, content: e.target.value })} placeholder="我们一起..." /></div>
        <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 0.85 }}>优先级</label><select value={wf.priority} onChange={e => setWf({ ...wf, priority: e.target.value })}><option value="high">⭐ 很重要</option><option value="medium">🌙 普通</option><option value="low">☁️ 慢慢来</option></select></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={() => setShowWish(false)} style={{ padding: '10px 24px', border: '2px solid var(--border)', borderRadius: 25, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>取消</button>
          <button onClick={saveWish} style={{ padding: '10px 24px', border: 'none', borderRadius: 25, background: 'var(--grad)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>保存 💾</button>
        </div>
      </Modal>}
    </div>
  )
}

function Modal({ children, onClose, title, theme }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: 16, width: '90%', maxWidth: 480, border: '2px solid ' + theme.primary, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 1.05 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 1.2, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}