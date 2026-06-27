# 恋爱日记部署说明

这是一个 Next.js App Router 项目，前端使用 `public/sea-memory.jpg` 作为海边背景，后端 API 使用 Neon PostgreSQL。上传到 GitHub 后，Vercel 会按 `package.json` 自动识别为 Next.js 项目。

## 项目结构

```text
love-journal-v2/
├── public/
│   └── sea-memory.jpg
├── database/
│   └── schema.sql
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/
│   │   │   ├── records/
│   │   │   ├── anniversaries/
│   │   │   ├── moods/
│   │   │   ├── wishes/
│   │   │   ├── letters/
│   │   │   └── stats/
│   │   ├── layout.jsx
│   │   ├── page.jsx
│   │   └── globals.css
│   ├── lib/
│   │   └── db.js
│   └── App.jsx
├── .env.example
├── next.config.js
└── package.json
```

## 功能

| 模块 | 内容 |
| --- | --- |
| 首页 | 海边背景、毛玻璃信息舱、追踪光效、数据库状态和核心统计 |
| 时光 | 新增、编辑、删除约会/日常/旅行/特别记录，支持搜索和筛选 |
| 纪念日 | 新增、编辑、删除纪念日，并真实计算下次周年倒计时和已过天数 |
| 心情 | 新增、编辑、删除每日心情，月历中自动显示 |
| 愿望 | 新增、编辑、删除愿望，支持完成状态切换和目标日期 |
| 情书 | 新增、编辑、删除情书内容 |

## Neon

1. 打开 [Neon](https://neon.tech) 并创建项目。
2. 复制连接字符串，格式类似：

```text
postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
```

3. 项目第一次访问 API 时会自动建表，不会自动写入示例内容。也可以手动执行 `database/schema.sql`。

## Vercel

1. 把整个 `C:\Users\26945\Desktop\love-journal-v2` 上传到 GitHub。
2. 在 Vercel 选择 **Add New Project**，导入这个 GitHub 仓库。
3. 添加环境变量：

```text
DATABASE_URL=你的 Neon 连接字符串
```

4. 其余保持默认，点击 Deploy。

## 本地开发

```powershell
cd "C:\Users\26945\Desktop\love-journal-v2"
npm install
Copy-Item .env.example .env.local
# 编辑 .env.local，把 DATABASE_URL 换成 Neon 连接字符串
npm run dev
```

访问 `http://localhost:3000`。

如果没有配置 `DATABASE_URL`，页面会提示数据库未连接，并且不会显示或写入假数据。
