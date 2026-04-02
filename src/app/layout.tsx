import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider"

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "A7 Commercial Hub",
  description: "Account Intelligence Platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  )
}
