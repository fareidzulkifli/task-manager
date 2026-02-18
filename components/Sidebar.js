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
  CheckCircle2
} from 'lucide-react'

export default function Sidebar() {
  const [navData, setNavData] = useState([])
  const [loading, setLoading] = useState(true)
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
      alert('Error creating organization: ' + err.message)
    }
  }

  if (pathname === '/login') return null

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Layers size={14} color="#fff" strokeWidth={3} />
          </div>
          <span className="text-gradient">Task Manager</span>
        </Link>
        
        <button
          onClick={handleCreateOrg}
          className="btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', fontSize: '13px' }}
        >
          <Plus size={16} />
          <span>New Organization</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <Link href="/" className={`sidebar-link ${pathname === '/' ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
        </div>

        <div className="nav-section" style={{ marginTop: '24px' }}>
          <h3 className="nav-section-title">Organizations</h3>
          {loading ? (
            <div style={{ padding: '12px', color: 'var(--text-disabled)', fontSize: '12px' }}>Loading...</div>
          ) : (
            <div className="sidebar-orgs">
              {navData.map(org => (
                <div key={org.id} className="sidebar-org-group">
                  <Link 
                    href={`/org/${org.id}`} 
                    className={`sidebar-link ${currentOrgId === org.id ? 'active' : ''}`}
                    style={{ marginTop: '2px' }}
                  >
                    <Briefcase size={18} />
                    <span style={{ flexGrow: 1 }}>{org.name}</span>
                    {currentOrgId === org.id && <ChevronRight size={14} opacity={0.5} />}
                  </Link>
                  
                  {currentOrgId === org.id && (
                    <div className="sidebar-projects">
                      {org.projects.map(project => (
                        <div key={project.id} className="sidebar-project-item">
                          <span className="sidebar-project-name" title={project.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-disabled)' }}></div>
                            {project.name}
                          </span>
                          {project.incomplete_tasks_count > 0 && (
                            <span className="sidebar-task-count" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-muted)', minWidth: '20px', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>
                              {project.incomplete_tasks_count}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {navData.length === 0 && !loading && (
                <div style={{ padding: '12px', color: 'var(--text-disabled)', fontSize: '12px' }}>No organizations found.</div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
        <LogoutButton style={{ width: '100%', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }} />
      </div>
    </aside>
  )
}
