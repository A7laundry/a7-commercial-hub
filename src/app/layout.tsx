import type { Metadata } from "next"
import "./globals.css"
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider"

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
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  )
}
