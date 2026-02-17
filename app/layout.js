import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata = {
  title: 'Task Manager',
  description: 'AI-powered Personal Task Management',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
