'use client';

import { useState, useEffect } from 'react'
import ProjectColumn from './ProjectColumn'
import TaskModal from './TaskModal'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

// Done tasks sink to the bottom; within each group sort by order_index
const sortTasks = (taskList) =>
  [...taskList].sort((a, b) => {
    const aDone = a.status === 'Done' ? 1 : 0
    const bDone = b.status === 'Done' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    return a.order_index - b.order_index
  })

export default function Board({ orgId }) {
  const [org, setOrg] = useState(null)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Updates a single task in local state — no refetch, no loading flash
  const handleTaskPatch = (taskId, updates) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    window.dispatchEvent(new Event('taskUpdated'))
  }

  const handleDragStart = (event) => {
    const { active } = event
    if (tasks.some(t => t.id === active.id)) {
      setActiveTaskId(active.id)
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveTaskId(null)

    if (!over || active.id === over.id) return

    const activeId = active.id

    // ── Project column reorder ──────────────────────────────────────────
    if (projects.some(p => p.id === activeId)) {
      setProjects(items => {
        const oldIndex = items.findIndex(i => i.id === activeId)
        const newIndex = items.findIndex(i => i.id === over.id)
        const reordered = arrayMove(items, oldIndex, newIndex)
        updateProjectOrders(reordered)
        return reordered
      })
      return
    }

    // ── Task drag ───────────────────────────────────────────────────────
    const sourceContainerId = active.data.current?.sortable?.containerId
    if (!sourceContainerId) return

    // Resolve destination container (project id)
    let destContainerId
    if (over.data.current?.sortable?.containerId) {
      destContainerId = over.data.current.sortable.containerId
    } else if (projects.some(p => p.id === over.id)) {
      destContainerId = over.id
    } else if (typeof over.id === 'string' && over.id.startsWith('col:')) {
      destContainerId = over.id.slice(4)
    } else {
      return
    }

    if (sourceContainerId === destContainerId) {
      // Same column — reorder using the same sorted order as displayed
      const projectTasks = sortTasks(tasks.filter(t => t.project_id === sourceContainerId))
      const oldIndex = projectTasks.findIndex(t => t.id === activeId)
      const newIndex = projectTasks.findIndex(t => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const reordered = arrayMove(projectTasks, oldIndex, newIndex)
      setTasks(prev => [
        ...prev.filter(t => t.project_id !== sourceContainerId),
        ...reordered,
      ])
      reordered.forEach((t, i) => {
        fetch(`/api/tasks/${t.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: i }),
        })
      })
    } else {
      // Cross-column move — update project_id
      const movedTask = tasks.find(t => t.id === activeId)
      if (!movedTask) return

      setTasks(prev => prev.map(t =>
        t.id === activeId ? { ...t, project_id: destContainerId } : t
      ))
      fetch(`/api/tasks/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: destContainerId }),
      }).then(() => window.dispatchEvent(new Event('taskUpdated')))
    }
  }

  const updateProjectOrders = async (newProjects) => {
    try {
      const updates = newProjects.map((p, index) => {
        return fetch(`/api/projects/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: index })
        })
      })
      await Promise.all(updates)
    } catch (err) {
      console.error('Error updating project orders:', err)
    }
  }

  const handleSummarizeProject = async (project) => {
    try {
      setAiLoading(true)
      const projectTasks = tasks.filter(t => t.project_id === project.id)
      const res = await fetch('/api/ai/project-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_context: project, tasks: projectTasks })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiSummary({ type: 'project', content: data.projectSummary, projectName: project.name })
    } catch (err) {
      alert('AI Error: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSummarizeOrg = async () => {
    try {
      setAiLoading(true)
      const summaries = await Promise.all(projects.map(async (project) => {
        const projectTasks = tasks.filter(t => t.project_id === project.id)
        const res = await fetch('/api/ai/project-summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_context: project, tasks: projectTasks })
        })
        const data = await res.json()
        return { name: project.name, summary: data.projectSummary }
      }))

      const res = await fetch('/api/ai/org-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_name: org.name, project_summaries: summaries })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiSummary({ type: 'org', content: data.orgSummary })
    } catch (err) {
      alert('AI Error: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  // isInitial=true: shows loading spinner (first mount only)
  // isInitial=false: silent background refresh — board stays visible
  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)

      const [orgRes, projectsRes, tasksRes] = await Promise.all([
        fetch(`/api/orgs/${orgId}`),
        fetch(`/api/projects?org_id=${orgId}`),
        fetch(`/api/tasks?org_id=${orgId}`),
      ])

      const [orgData, projectsData, tasksData] = await Promise.all([
        orgRes.json(),
        projectsRes.json(),
        tasksRes.json(),
      ])

      if (orgData.error) throw new Error(orgData.error)
      if (projectsData.error) throw new Error(projectsData.error)
      if (tasksData.error) throw new Error(tasksData.error)

      setOrg(orgData)
      setProjects(projectsData)
      setTasks(tasksData)
    } catch (err) {
      setError(err.message)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) fetchData(true)
  }, [orgId])

  const openTaskModal = (task) => {
    setSelectedTask(task)
    setIsTaskModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsTaskModalOpen(false)
    setSelectedTask(null)
  }

  const handleCreateProject = async () => {
    const name = prompt('Project Name:')
    if (!name) return

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          org_id: orgId,
          order_index: projects.length
        })
      })
      const newProject = await res.json()
      if (newProject.error) throw new Error(newProject.error)
      setProjects([...projects, newProject])
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      alert('Error creating project: ' + err.message)
    }
  }

  if (loading) return <div style={{ padding: '40px' }}>Loading board...</div>
  if (error) return <div style={{ padding: '40px', color: 'var(--error)' }}>Error: {error}</div>

  return (
    <div className="board-view">
      <header className="board-header">
        <div>
          <h1 style={{ fontSize: '22px', letterSpacing: '-0.03em' }}>{org?.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            {aiLoading ? 'AI is thinking...' : 'Kanban Board'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={handleSummarizeOrg} className="btn-ghost">Org Summary</button>
          <button onClick={handleCreateProject}>+ New Project</button>
        </div>
      </header>

      {aiSummary && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '760px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>
              {aiSummary.type === 'org' ? 'Organization Overview' : `Project Summary: ${aiSummary.projectName}`}
            </h2>
            <div style={{ lineHeight: '1.7', background: 'var(--surface-alt)', padding: '20px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', color: 'var(--text-secondary)' }}>{aiSummary.content}</pre>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setAiSummary(null)} className="btn-ghost">Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="kanban-board">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={projects.map(p => p.id)}
            strategy={horizontalListSortingStrategy}
          >
            {projects.map(project => {
              const projectTasks = sortTasks(tasks.filter(t => t.project_id === project.id))
              return (
                <div key={project.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <SortableContext
                    id={project.id}
                    items={projectTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ProjectColumn
                      project={project}
                      tasks={projectTasks}
                      onTaskClick={openTaskModal}
                      onTasksUpdated={() => fetchData(false)}
                      onTaskPatch={handleTaskPatch}
                    />
                  </SortableContext>
                  <button
                    onClick={() => handleSummarizeProject(project)}
                    className="btn-ghost"
                    style={{ margin: '10px 0', fontSize: '11px', padding: '5px 10px' }}
                  >
                    Summarize Project
                  </button>
                </div>
              )
            })}
          </SortableContext>

          {/* Floating ghost card while dragging */}
          <DragOverlay dropAnimation={null}>
            {(() => {
              if (!activeTaskId) return null
              const t = tasks.find(t => t.id === activeTaskId)
              if (!t) return null
              const cls = t.urgent && t.important ? 'priority-urgent-important'
                : t.urgent ? 'priority-urgent'
                : t.important ? 'priority-important'
                : 'priority-none'
              const label = t.urgent && t.important ? 'Urgent & Important'
                : t.urgent ? 'Urgent'
                : t.important ? 'Important'
                : 'Neither'
              return (
                <div className={`task-card ${cls}`} style={{ boxShadow: 'var(--shadow-lg)', opacity: 0.92, cursor: 'grabbing', width: '288px' }}>
                  <div className="task-card-header">
                    <div className="task-card-grip" style={{ color: 'var(--text-muted)' }}>
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                        <circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/>
                        <circle cx="2" cy="6" r="1.4"/><circle cx="8" cy="6" r="1.4"/>
                        <circle cx="2" cy="10" r="1.4"/><circle cx="8" cy="10" r="1.4"/>
                      </svg>
                    </div>
                    <div className={`task-priority-tag ${cls}`}>{label}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)' }}>{t.summary}</div>
                </div>
              )
            })()}
          </DragOverlay>
        </DndContext>
      </div>

      {isTaskModalOpen && (
        <TaskModal
          task={selectedTask}
          onClose={handleCloseModal}
          onTaskUpdated={() => fetchData(false)}
          onTaskPatch={handleTaskPatch}
          projectContext={projects.find(p => p.id === selectedTask?.project_id)}
        />
      )}
    </div>
  )
}
