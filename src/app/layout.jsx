import { Noto_Sans_SC } from "next/font/google"
import "./globals.css"

const sans = Noto_Sans_SC({
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-sans",
})

export const metadata = {
  title: "情侣空间",
  description: "一个带登录、情侣绑定、私密内容和共享记录的恋爱日记网站。",
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className={sans.variable}>{children}</body>
    </html>
  )
}
