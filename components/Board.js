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
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Sparkles, Plus, Search, Filter, Loader2, GripVertical, Check, Clock, AlertCircle } from 'lucide-react'

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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px' }}>
      <Loader2 className="animate-spin" size={24} color="var(--accent)" />
      <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Initializing board...</span>
    </div>
  )
  
  if (error) return <div style={{ padding: '40px', color: 'var(--error)' }}>Error: {error}</div>

  return (
    <div className="board-view">
      <header className="board-header">
        <div className="board-title-group">
          <h1 className="board-title">{org?.name}</h1>
          <div className="badge" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-muted)' }}>
            {projects.length} Projects
          </div>
          {aiLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Loader2 className="animate-spin" size={14} />
              AI is working...
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-disabled)' }} />
            <input 
              type="text" 
              placeholder="Quick search..." 
              style={{ width: '200px', paddingLeft: '32px', fontSize: '13px', background: 'var(--background)', height: '36px' }}
            />
          </div>
          
          <button 
            onClick={handleSummarizeOrg} 
            className="btn-ghost"
            style={{ height: '36px', padding: '0 16px' }}
          >
            <Sparkles size={16} color="var(--accent)" />
            <span>AI Overview</span>
          </button>
          
          <button 
            onClick={handleCreateProject}
            className="btn-primary"
            style={{ height: '36px', padding: '0 16px' }}
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {aiSummary && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={20} color="var(--accent)" />
                {aiSummary.type === 'org' ? 'Organization Overview' : `Project Summary: ${aiSummary.projectName}`}
              </h2>
              <button onClick={() => setAiSummary(null)} className="btn-ghost" style={{ padding: '8px' }}>Close</button>
            </div>
            <div className="modal-body">
              <div style={{ 
                lineHeight: '1.8', 
                background: 'var(--background)', 
                padding: '32px', 
                borderRadius: 'var(--radius-lg)', 
                border: '1px solid var(--border)',
                fontSize: '15px',
                color: 'var(--text-secondary)'
              }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{aiSummary.content}</pre>
              </div>
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
                    style={{ 
                      marginTop: '12px', 
                      fontSize: '12px', 
                      padding: '8px 12px', 
                      width: '100%', 
                      justifyContent: 'center',
                      borderStyle: 'dashed',
                      opacity: 0.8
                    }}
                  >
                    <Sparkles size={14} color="var(--accent)" />
                    <span>Summarize Project</span>
                  </button>
                </div>
              )
            })}
          </SortableContext>

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {(() => {
              if (!activeTaskId) return null
              const t = tasks.find(t => t.id === activeTaskId)
              if (!t) return null
              const isDone = t.status === 'Done'
              return (
                <div className="task-card" style={{ 
                  boxShadow: 'var(--shadow-xl)', 
                  cursor: 'grabbing', 
                  width: '320px',
                  background: 'var(--surface-raised)',
                  borderColor: 'var(--accent)',
                  transform: 'scale(1.05)',
                  transition: 'transform 0.1s ease'
                }}>
                  <div className="task-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GripVertical size={14} style={{ color: 'var(--accent)' }} />
                      <div className="task-meta">
                        {t.urgent && <span style={{ color: 'var(--warning)' }}><AlertCircle size={12} /></span>}
                        {t.important && <span style={{ color: 'var(--accent)' }}><Clock size={12} /></span>}
                      </div>
                    </div>
                    <button
                      className={`btn-ghost ${isDone ? 'done' : ''}`}
                      style={{ 
                        padding: '2px', 
                        borderRadius: '50%', 
                        width: '20px', 
                        height: '20px',
                        border: `1px solid ${isDone ? 'var(--success)' : 'var(--border-strong)'}`,
                        background: isDone ? 'var(--success-muted)' : 'transparent',
                        color: isDone ? 'var(--success)' : 'transparent'
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                  </div>
                  <div className="task-summary">{t.summary}</div>
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
