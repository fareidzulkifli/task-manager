'use client';

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  ArrowRight,
  Loader2,
  Plus
} from 'lucide-react'

export default function Home() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard')
        const data = await res.json()
        if (Array.isArray(data)) {
          setProjects(data)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px' }}>
      <Loader2 className="animate-spin" size={24} color="var(--accent)" />
      <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Loading dashboard...</span>
    </div>
  )

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="dashboard-title text-gradient">Dashboard</h1>
          <p className="dashboard-subtitle">Overview of your most recently active projects</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="badge" style={{ padding: '6px 12px', background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
            <TrendingUp size={14} style={{ marginRight: '6px' }} />
            Active Productivity
          </div>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px 48px', borderStyle: 'dashed', background: 'transparent' }}>
          <div className="sidebar-logo-icon" style={{ width: '48px', height: '48px', margin: '0 auto 24px', borderRadius: '12px' }}>
            <Layers size={24} color="#fff" />
          </div>
          <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>No projects yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '320px', margin: '0 auto 32px', lineHeight: '1.6' }}>
            Get started by creating your first organization and project from the sidebar.
          </p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/org/${project.org_id}`}
              className="project-card animate-fade-in"
              style={{ padding: '28px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <span className="project-card-org" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                    {project.org_name}
                  </span>
                  <h3 className="project-card-name" style={{ marginTop: '8px', fontSize: '18px' }}>{project.name}</h3>
                </div>
                <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: '8px', color: 'var(--text-muted)' }}>
                  <ArrowRight size={18} />
                </div>
              </div>

              <p className="project-card-desc" style={{ marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
                {project.goal || project.description_markdown || 'No description available.'}
              </p>

              <div className="project-card-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <div className="project-stats" style={{ gap: '24px' }}>
                  <div className="project-stat" style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <Circle size={10} color="var(--accent)" fill="var(--accent)" />
                      <span className="project-stat-label">To Do</span>
                    </div>
                    <div className="project-stat-value" style={{ fontSize: '24px' }}>{project.incomplete_tasks}</div>
                  </div>
                  <div className="project-stat" style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <CheckCircle2 size={12} />
                      <span className="project-stat-label">Total</span>
                    </div>
                    <div className="project-stat-value" style={{ fontSize: '24px', color: 'var(--text-disabled)' }}>{project.total_tasks}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <Clock size={12} />
                  {new Date(project.last_worked_on).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
