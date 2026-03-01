'use client'

import Link from 'next/link'
import { BookOpen, LogIn } from 'lucide-react'
import GitNoteViewer from './GitNoteViewer'

export default function ShareNoteLayout({ filePath }) {
  return (
    <div className="gitnote-page">
      <header className="gitnote-topbar">
        <div className="gitnote-topbar-left">
          <div className="gitnote-brand">
            <BookOpen size={15} className="gitnote-brand-icon" />
            <span className="gitnote-brand-name">BA Notes</span>
            <span className="gitnote-brand-sub">fareidzulkifli</span>
          </div>
        </div>
        <Link href="/login" className="share-signin-btn">
          <LogIn size={13} />
          <span>Sign in to browse</span>
        </Link>
      </header>
      <div className="share-body">
        <GitNoteViewer filePath={filePath} />
      </div>
    </div>
  )
}
