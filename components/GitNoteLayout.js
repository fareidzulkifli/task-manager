'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, LayoutDashboard, Menu, X } from 'lucide-react'
import GitNoteExplorer from './GitNoteExplorer'
import GitNoteViewer from './GitNoteViewer'

export default function GitNoteLayout({ initialPath }) {
  const router = useRouter()
  const [selectedPath, setSelectedPath] = useState(
    initialPath && initialPath.length > 0 ? initialPath.join('/') : null
  )
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const path = initialPath && initialPath.length > 0 ? initialPath.join('/') : null
    setSelectedPath(path)
  }, [initialPath?.join('/')])

  const handleSelect = (path) => {
    setSelectedPath(path)
    router.push('/gitnote/' + path)
    if (isMobile) setExplorerOpen(false)
  }

  return (
    <div className="gitnote-page">
      <header className="gitnote-topbar">
        <div className="gitnote-topbar-left">
          <button 
            className="gitnote-icon-btn gn-mobile-only" 
            onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
            title="Open App Menu"
          >
            <LayoutDashboard size={16} />
          </button>
          
          <button 
            className="gitnote-icon-btn gn-mobile-only" 
            onClick={() => setExplorerOpen(o => !o)} 
            title="Toggle Explorer"
          >
            {explorerOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          
          <div className="gitnote-brand">
            <BookOpen size={15} className="gitnote-brand-icon" />
            <span className="gitnote-brand-name">BA Notes</span>
            <span className="gitnote-brand-sub">fareidzulkifli</span>
          </div>
        </div>

        <Link href="/task/dashboard" className="gitnote-back-btn gn-desktop-only">
          <LayoutDashboard size={13} />
          <span>Back to App</span>
        </Link>
      </header>

      <div className="gitnote-body">
        {explorerOpen && (
          <div className="sidebar-backdrop open gn-mobile-only" onClick={() => setExplorerOpen(false)} />
        )}

        <aside className={`gitnote-explorer ${explorerOpen ? 'mobile-open' : 'mobile-hidden'}`}>
          <div className="gitnote-explorer-header">
            <span className="gitnote-explorer-label">Files</span>
          </div>
          <GitNoteExplorer selectedPath={selectedPath} onSelect={handleSelect} />
        </aside>

        <GitNoteViewer filePath={selectedPath} />
      </div>
    </div>
  )
}
