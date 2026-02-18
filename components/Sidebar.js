'use client';

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import { 
  LayoutDashboard, 
  Plus, 
  ChevronRight, 
  Briefcase, 
  Settings, 
  LogOut, 
  MoreVertical,
  Layers,
  CheckCircle2,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'

export default function Sidebar() {
  const [navData, setNavData] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const params = useParams()
  const pathname = usePathname()
  const currentOrgId = params?.id

  const fetchNav = async () => {
    try {
      const res = await fetch('/api/nav')
      const data = await res.json()
      if (Array.isArray(data)) {
        setNavData(data)
      }
    } catch (err) {
      console.error('Failed to fetch nav data', err)
    } finally {
      setLoading(false)
    }
  }

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev)
    window.addEventListener('toggle-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  useEffect(() => {
    // Close sidebar on route change (mobile)
    setIsMobileOpen(false)
  }, [pathname, currentOrgId])

  useEffect(() => {
    if (pathname === '/login') return
    fetchNav()
    
    window.addEventListener('taskUpdated', fetchNav)
    const interval = setInterval(fetchNav, 60000)
    return () => {
      window.removeEventListener('taskUpdated', fetchNav)
      clearInterval(interval)
    }
  }, [pathname])

  const handleCreateOrg = async () => {
    const name = prompt('Organization Name:')
    if (!name) return

    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          order_index: navData.length 
        })
      })
      const newOrg = await res.json()
      if (newOrg.error) throw new Error(newOrg.error)
      fetchNav()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  if (pathname === '/login') return null

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div 
        className={`sidebar-backdrop ${isMobileOpen ? 'open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />
      
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`} style={{ background: 'var(--surface)' }}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" className="sidebar-logo">
              <div className="sidebar-logo-icon">
                <Layers size={14} color="#fff" strokeWidth={3} />
              </div>
              <span style={{ color: 'var(--text)' }}>Task Manager</span>
            </Link>
            <button 
              className="btn-ghost mobile-close-btn"
              onClick={() => setIsMobileOpen(false)}
              style={{ padding: '4px' }}
            >
              <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={handleCreateOrg}
            className="btn-ghost"
            style={{ flexGrow: 1, justifyContent: 'flex-start', padding: '8px 12px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace' }}
          >
            <Plus size={14} />
            <span>Create ORG</span>
          </button>
          
          <button
            onClick={toggleTheme}
            className="btn-ghost"
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
            title={theme === 'dark' ? 'Switch to Technical Light' : 'Switch to Industrial Dark'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <Link href="/" className={`sidebar-link ${pathname === '/' ? 'active' : ''}`} style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
        </div>

        <div className="nav-section" style={{ marginTop: '24px' }}>
          <h3 className="nav-section-title" style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.15em' }}>WORKSPACE</h3>
          {loading ? (
            <div style={{ padding: '12px', color: 'var(--text-disabled)', fontSize: '10px', fontFamily: 'monospace' }}>FETCHING_NODES...</div>
          ) : (
            <div className="sidebar-orgs">
              {navData.map(org => (
                <div key={org.id} className="sidebar-org-group">
                  <Link 
                    href={`/org/${org.id}`} 
                    className={`sidebar-link ${currentOrgId === org.id ? 'active' : ''}`}
                    style={{ marginTop: '2px', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}
                  >
                    <Briefcase size={16} />
                    <span style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name.toUpperCase()}</span>
                    {currentOrgId === org.id && <ChevronRight size={12} opacity={0.5} />}
                  </Link>
                  
                  {currentOrgId === org.id && (
                    <div className="sidebar-projects" style={{ borderLeft: '1px solid var(--border-strong)', marginLeft: '20px', paddingLeft: '0' }}>
                      {org.projects.map(project => (
                        <div key={project.id} className="sidebar-project-item" style={{ paddingLeft: '16px' }}>
                          <span className="sidebar-project-name" title={project.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
                            <div style={{ width: '4px', height: '1px', background: 'var(--text-disabled)' }}></div>
                            {project.name.toUpperCase()}
                          </span>
                          {project.incomplete_tasks_count > 0 && (
                            <span style={{ 
                              background: 'var(--accent-subtle)', 
                              color: 'var(--accent)', 
                              fontSize: '9px', 
                              fontWeight: '900', 
                              padding: '1px 5px', 
                              borderRadius: '4px',
                              border: '1px solid var(--accent-muted)'
                            }}>
                              {project.incomplete_tasks_count.toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-strong)', marginTop: 'auto', background: 'var(--background)' }}>
        <LogoutButton style={{ width: '100%', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-strong)', fontSize: '11px', fontWeight: '800', fontFamily: 'monospace' }} />
      </div>
    </aside>
    </>
  )
}
