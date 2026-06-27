# 部署说明

这是一个标准 Next.js 项目，上传到 GitHub 后可以被 Vercel 自动识别。

## 项目结构

```text
love-journal-v2/
|-- public/
|   |-- sea-memory.jpg
|   |-- avatar.jpg
|-- database/
|   |-- schema.sql
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |-- globals.css
|   |   |-- layout.jsx
|   |   |-- page.jsx
|   |-- lib/
|   |   |-- auth.js
|   |   |-- db.js
|   |-- App.jsx
|-- .env.example
|-- next.config.js
|-- package.json
```

## Neon

1. 在 [Neon](https://neon.tech) 创建项目。
2. 复制 PostgreSQL 连接字符串，格式类似：

```text
postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
```

3. 可以手动执行 `database/schema.sql`，也可以让项目首次访问 API 时自动建表。

## Vercel

1. 将 `C:\Users\26945\Desktop\love-journal-v2` 上传到 GitHub。
2. 在 Vercel 选择 **Add New Project**，导入该仓库。
3. 添加环境变量：

```text
DATABASE_URL=你的 Neon 连接字符串
AUTH_SECRET=一段足够长的随机字符串
REGISTER_INVITE_CODE=0728
```

4. Framework Preset 保持 Next.js，Build Command 保持 `next build`。
5. 点击 Deploy。

## 注意

- 注册必须填写邀请码。
- 未登录时只能看到登录和注册页。
- 未绑定情侣时，共享内容会自动保存为私密。
- 只有自己的内容可以编辑或删除。
- 伴侣只能看到你设置为共享的内容。
