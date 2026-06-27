# 情侣空间

一个可部署到 Vercel 的私密情侣日记网站，使用 Next.js App Router 和 Neon PostgreSQL。

## 已完成

- 登录、注册、退出登录
- 注册邀请码校验，默认 `0728`，可用 `REGISTER_INVITE_CODE` 覆盖
- 情侣绑定申请、同意、拒绝、解绑
- 日常、心情、纪念日、愿望、信件、照片墙、评论
- 内容按用户隔离，支持 `private` 和 `shared`
- 日常图片前端压缩后写入数据库
- 纪念日真实倒计时
- 海边照片背景、毛玻璃界面、鼠标光效追踪

## 本地运行

```powershell
cd "C:\Users\26945\Desktop\love-journal-v2"
npm install
Copy-Item .env.example .env.local
# 编辑 .env.local，填入 Neon 的 DATABASE_URL 和 AUTH_SECRET
npm run dev
```

访问 `http://localhost:3000`。

## 环境变量

```text
DATABASE_URL=Neon PostgreSQL 连接字符串
AUTH_SECRET=用于签名登录 Cookie 的长随机字符串
REGISTER_INVITE_CODE=注册邀请码，默认 0728
```

项目首次访问 API 时会自动建表和迁移，不会写入假内容。
