'use client';

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

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
    
    // Refresh nav data on task updates
    window.addEventListener('taskUpdated', fetchNav)
    
    // Refresh nav data every minute as fallback
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

  if (loading) return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Task Manager</h2>
      </div>
      <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Loading...</div>
    </aside>
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <h2>Task Manager</h2>
        </Link>
        <Link href="/" className={`sidebar-org-link ${pathname === '/' ? 'active' : ''}`} style={{ marginTop: '12px' }}>
          Dashboard
        </Link>
        <button
          onClick={handleCreateOrg}
          className="btn-ghost"
          style={{ marginTop: '8px', width: '100%', fontSize: '12px', padding: '6px 10px' }}
        >
          + New Org
        </button>
      </div>
      <nav className="sidebar-nav">
        {navData.map(org => (
          <div key={org.id} className={`sidebar-org ${currentOrgId === org.id ? 'active' : ''}`}>
            <Link href={`/org/${org.id}`} className="sidebar-org-link">
              {org.name}
            </Link>
            <div className="sidebar-projects">
              {org.projects.map(project => (
                <div key={project.id} className="sidebar-project">
                  <span className="sidebar-project-name" title={project.name}>
                    {project.name}
                  </span>
                  {project.incomplete_tasks_count > 0 && (
                    <span className="sidebar-task-count">
                      {project.incomplete_tasks_count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {navData.length === 0 && (
        <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
          No organizations found.
        </div>
      )}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <LogoutButton style={{ width: '100%' }} />
      </div>
    </aside>
  )
}
