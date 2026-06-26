# 💕 恋爱日记 - 完整部署指南

## 项目结构
```
love-journal-v2/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── records/route.js       ← 记录 CRUD
│   │   │   ├── anniversaries/route.js ← 纪念日 CRUD
│   │   │   ├── moods/route.js         ← 心情 CRUD
│   │   │   ├── wishes/route.js        ← 愿望 CRUD
│   │   │   ├── stats/route.js         ← 统计数据
│   │   │   └── settings/route.js      ← 设置 CRUD
│   │   ├── layout.jsx                  ← 根布局
│   │   ├── page.jsx                    ← 首页
│   │   └── globals.css                 ← 全局样式
│   └── App.jsx                         ← 主应用组件
├── db.js                               ← PostgreSQL 数据库连接
├── package.json
├── next.config.js
├── .gitignore
└── DEPLOY.md                           ← 本文件
```

## 功能清单
| 模块 | 功能 |
|------|------|
| 📅 时间线 | 按日期记录日常/约会/旅行，支持搜索和类型筛选 |
| ⏳ 纪念日 | 自动计算在一起天数，自定义多个纪念日+emoji图标 |
| 😊 心情日记 | 月度心情日历，心情趋势列表 |
| 🌟 愿望清单 | 共同愿望，分级标注（重要/普通/慢慢来），勾选完成 |
| 📊 数据统计 | 在一起天数、记录总数、照片数、平均心情等 |
| ⚙️ 设置 | 4 种主题色（粉/蓝/紫/金）、对方名字、数据导出 |
| ✨ 动画 | 飘落爱心粒子效果 |

---

## 部署步骤（3 步）

### 第 1 步：创建 Neon 数据库（免费）

1. 打开 [neon.tech](https://neon.tech) → 注册/登录
2. 点击 **New Project**
3. 填写项目名称（如 `love-journal`）→ 选择区域（选离你近的）
4. 创建完成后，进入 **Connection Details**
5. 选择 **Auto-generated password**
6. 复制 **Connection string**，类似：
   ```
   postgresql://owner.npg_xxx:password@ep-cool-art-123.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

### 第 2 步：创建 GitHub 仓库

1. 打开 [github.com](https://github.com) → 右上角 **+** → **New repository**
2. 填写仓库名（如 `love-journal`）
3. 设为 **Public** 或 **Private**
4. 点击 **Create repository**
5. 复制仓库地址：`https://github.com/YOUR_USERNAME/love-journal.git`

### 第 3 步：推送代码到 GitHub

打开 **PowerShell**，依次执行：

```powershell
cd "C:\Users\王昊晟\Documents\Codex\2026-06-26\w\outputs\love-journal-v2"
git init
git add .
git commit -m "Initial commit: 恋爱日记 💕"
git remote add origin https://github.com/YOUR_USERNAME/love-journal.git
git branch -M main
git push -u origin main
```

> 把 `YOUR_USERNAME` 换成你的 GitHub 用户名

### 第 4 步：Vercel 部署

1. 打开 [vercel.com](https://vercel.com) → 登录
2. 点击 **Add New...** → **Project**
3. 在 **Git Import Form** 中找到 `love-journal` 仓库，点击 **Import**
4. 配置环境变量：
   - 点击 **Environment Variables**
   - 添加 `DATABASE_URL`，值为 Neon 的连接字符串
5. 框架会自动识别为 **Next.js**
6. 点击 **Deploy**

### 第 5 步：配置域名（可选）

1. 在 Vercel 项目设置 → **Domains**
2. 添加你的自定义域名
3. 在 Cloudflare DNS 中添加 CNAME 记录

---

## 本地开发

```powershell
cd "C:\Users\王昊晟\Documents\Codex\2026-06-26\w\outputs\love-journal-v2"
npm install
# 创建 .env.local 文件，写入：
# DATABASE_URL=你的Neon连接字符串
npm run dev
# 访问 http://localhost:3000
```

---

## 费用

| 服务 | 免费额度 | 用途 |
|------|----------|------|
| Vercel | 个人项目完全免费 | 托管前端+API |
| Neon | 512MB 数据库 | 持久化存储 |
| Cloudflare | 免费版 | DNS 解析 |

---

## 常见问题

**Q: 数据会丢吗？**
A: 不会。数据存储在 Neon 云端数据库中，不会丢失。

**Q: 可以换域名吗？**
A: 可以。在 Vercel 设置中添加自定义域名即可。

**Q: 只有两个人能用吗？**
A: 任何人都可以访问你的网址。如果需要权限控制，可以后续添加登录功能。