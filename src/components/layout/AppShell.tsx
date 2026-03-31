import { Sidebar } from "./Sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-60 flex flex-col min-h-screen">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
