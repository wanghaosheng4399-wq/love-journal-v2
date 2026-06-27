# 恋爱日记

海边照片背景的恋爱纪念网站，使用 Next.js、Vercel 和 Neon PostgreSQL。

## 快速开始

```powershell
npm install
Copy-Item .env.example .env.local
# 在 .env.local 中填写 DATABASE_URL
npm run dev
```

数据库会自动建表，但不会写入假内容。所有记录、纪念日、心情、愿望和情书都需要通过页面新增，并会保存到 Neon。
