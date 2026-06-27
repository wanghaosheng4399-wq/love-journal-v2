import { Noto_Sans_SC } from "next/font/google"
import "./globals.css"

const sans = Noto_Sans_SC({
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-sans",
})

export const metadata = {
  title: "恋爱日记",
  description: "一座给两个人收藏回忆、纪念日、心情和愿望的海边恋爱网站。",
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className={sans.variable}>{children}</body>
    </html>
  )
}
