'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Menu, X } from 'lucide-react'
import GitNoteExplorer from './GitNoteExplorer'
import GitNoteViewer from './GitNoteViewer'

export default function GitNoteLayout({ initialPath }) {
  const router = useRouter()
  const [selectedPath, setSelectedPath] = useState(
    initialPath && initialPath.length > 0 ? initialPath.join('/') : null
  )
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [desktopExplorerOpen, setDesktopExplorerOpen] = useState(true)
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
      {/* Mobile-only bar: open app sidebar + toggle file explorer */}
      <div className="gitnote-mobile-bar">
        <button
          className="gitnote-icon-btn"
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          title="Open App Menu"
        >
          <LayoutDashboard size={18} />
        </button>
        <span className="gitnote-mobile-title">BA Notes</span>
        <button
          className="gitnote-icon-btn"
          onClick={() => setExplorerOpen(o => !o)}
          title="Toggle Files"
        >
          {explorerOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div className="gitnote-body">
        {explorerOpen && (
          <div className="sidebar-backdrop open gn-mobile-only" onClick={() => setExplorerOpen(false)} />
        )}

        <GitNoteViewer 
          filePath={selectedPath} 
          onToggleExplorer={() => setDesktopExplorerOpen(o => !o)}
          explorerVisible={desktopExplorerOpen}
        />

        <aside className={`gitnote-explorer ${explorerOpen ? 'mobile-open' : 'mobile-hidden'} ${desktopExplorerOpen ? '' : 'desktop-hidden'}`}>
          <div className="gitnote-explorer-header">
            <span className="gitnote-explorer-label">Files</span>
          </div>
          <GitNoteExplorer selectedPath={selectedPath} onSelect={handleSelect} />
        </aside>
      </div>
    </div>
  )
}
