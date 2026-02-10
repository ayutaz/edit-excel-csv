import type React from "react"

interface AppShellProps {
  children: React.ReactNode
  header: React.ReactNode
  statusBar: React.ReactNode
}

export function AppShell({ children, header, statusBar }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {header}
      <main className="flex-1 overflow-hidden">{children}</main>
      {statusBar}
    </div>
  )
}
