'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import GitNoteViewer from './GitNoteViewer'

export default function ShareNoteLayout({ filePath }) {
  const [theme, setTheme] = useState('light')

  return (
    <div className="gitnote-page" data-theme={theme}>
      <header className="gitnote-topbar">
        <div className="gitnote-brand">
          <span className="gitnote-brand-name">BA Notes</span>
          <span className="gitnote-brand-sep">·</span>
          <span className="gitnote-brand-sub">fareidzulkifli</span>
        </div>
        <Link href="/login" className="share-signin-btn">
          <LogIn size={12} />
          <span>Log In</span>
        </Link>
      </header>
      <div className="share-body">
        <GitNoteViewer
          filePath={filePath}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        />
      </div>
    </div>
  )
}
