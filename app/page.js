'use client';

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-muted)' }}>Loading dashboard...</div>

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Overview of your most recently active projects</p>
      </header>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 48px' }}>
          <h2 style={{ marginBottom: '12px', fontSize: '18px' }}>No projects yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Create your first organization and project to get started.
          </p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/org/${project.org_id}`}
              className="project-card"
            >
              <div>
                <span className="project-card-org">{project.org_name}</span>
                <h3 className="project-card-name">{project.name}</h3>
              </div>

              <p className="project-card-desc">
                {project.goal || project.description_markdown || 'No description available.'}
              </p>

              <div className="project-card-footer">
                <div className="project-stats">
                  <div className="project-stat">
                    <div className="project-stat-value">{project.incomplete_tasks}</div>
                    <div className="project-stat-label">To Do</div>
                  </div>
                  <div className="project-stat">
                    <div className="project-stat-value">{project.total_tasks}</div>
                    <div className="project-stat-label">Total</div>
                  </div>
                </div>
                <div className="project-card-date">
                  {new Date(project.last_worked_on).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
