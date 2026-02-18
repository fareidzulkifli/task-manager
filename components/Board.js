'use client';

import { useState, useEffect } from 'react'
import ProjectColumn from './ProjectColumn'
import TaskModal from './TaskModal'
import ListView from './ListView'
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
import { 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  GripVertical, 
  Check, 
  Clock, 
  AlertCircle,
  Database,
  Activity,
  Maximize2,
  Cpu,
  Layers,
  Terminal,
  Zap,
  ArrowRight,
  Hash,
  LayoutGrid,
  List,
  History,
  RefreshCcw
} from 'lucide-react'

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
  const [viewMode, setViewMode] = useState('list')
  const [completedTasksProject, setCompletedTasksProject] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

    const sourceContainerId = active.data.current?.sortable?.containerId
    if (!sourceContainerId) return

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
    const name = prompt('Project ID Name:')
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
      alert('Error: ' + err.message)
    }
  }

  const handleViewCompleted = (project) => {
    setCompletedTasksProject(project)
  }

  const handleRestoreTask = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'In Progress' })
      })
      const updatedTask = await res.json()
      if (updatedTask.error) throw new Error(updatedTask.error)
      
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t))
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      alert('Error restoring task: ' + err.message)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: 'var(--background)' }}>
      <Loader2 className="animate-spin" size={20} color="var(--accent)" />
      <span style={{ color: 'var(--text-disabled)', fontWeight: '600', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.1em' }}>INITIALIZING_CORE_SYSTEM...</span>
    </div>
  )
  
  if (error) return <div style={{ padding: '40px', color: 'var(--error)', fontFamily: 'monospace' }}>SYSTEM_ERROR: {error}</div>

  return (
    <div className="board-view" style={{ background: 'var(--background)' }}>
      {/* Industrial Header */}
      <header className="board-header" style={{ 
        height: '64px', 
        padding: '0 32px', 
        background: 'var(--surface)', 
        borderBottom: '1px solid var(--border-strong)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} color="var(--accent)" />
            <h1 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.04em', color: 'var(--text)' }}>
              {org?.name?.toUpperCase()}
            </h1>
          </div>
          
          <div style={{ height: '24px', width: '1px', background: 'var(--border-strong)' }}></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: 'var(--text-disabled)', fontFamily: 'monospace' }}>
              <Layers size={14} />
              <span>PROJECTS: {projects.length.toString().padStart(2, '0')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: 'var(--text-disabled)', fontFamily: 'monospace' }}>
              <Activity size={14} />
              <span>Active Tasks: {tasks.filter(t => t.status !== 'Done').length.toString().padStart(3, '0')}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: '6px', overflow: 'hidden' }}>
            <button 
              onClick={() => setViewMode('kanban')}
              style={{
                background: viewMode === 'kanban' ? 'var(--surface-raised)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--accent)' : 'var(--text-disabled)',
                padding: '6px 10px',
                border: 'none',
                borderRadius: '0',
                transition: 'all 0.15s'
              }}
              title="Kanban View"
            >
              <LayoutGrid size={14} />
            </button>
            <div style={{ width: '1px', background: 'var(--border-strong)' }} />
            <button 
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? 'var(--surface-raised)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent)' : 'var(--text-disabled)',
                padding: '6px 10px',
                border: 'none',
                borderRadius: '0',
                transition: 'all 0.15s'
              }}
              title="List View"
            >
              <List size={14} />
            </button>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-strong)' }} />

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-disabled)' }} />
            <input 
              type="text" 
              placeholder="SEARCH" 
              style={{ width: '240px', paddingLeft: '36px', height: '36px', background: 'var(--background)', fontSize: '11px', fontFamily: 'monospace', fontWeight: '600' }}
            />
          </div>
          
          <button 
            onClick={handleSummarizeOrg} 
            className="btn-ghost"
            style={{ height: '36px', border: '1px solid var(--border-strong)', background: 'var(--background)', padding: '0 16px', fontSize: '11px', fontWeight: '700' }}
          >
            <Zap size={14} color="var(--accent)" />
            AI Synthesis
          </button>
          
          <button 
            onClick={handleCreateProject}
            className="btn-primary"
            style={{ height: '36px', padding: '0 16px', fontSize: '11px', fontWeight: '700' }}
          >
            <Plus size={14} />
            Add Project
          </button>
        </div>
      </header>

      {/* AI Intelligence Overlay */}
      {aiSummary && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-content" style={{ maxWidth: '900px', border: '1px solid var(--accent-muted)', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Cpu size={20} color="var(--accent)" />
                <h2 style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                  {aiSummary.type === 'org' ? 'SYSTEM_OVERVIEW_SYNTHESIS' : `PROJECT_ANALYSIS: ${aiSummary.projectName.toUpperCase()}`}
                </h2>
              </div>
              <button onClick={() => setAiSummary(null)} className="btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '32px', background: 'var(--background)' }}>
              <div style={{ 
                lineHeight: '1.8', 
                background: 'rgba(0,0,0,0.3)', 
                padding: '40px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-strong)',
                fontSize: '15px',
                color: 'var(--text-secondary)',
                fontFamily: 'Inter, sans-serif'
              }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{aiSummary.content}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Board Area */}
      {viewMode === 'list' ? (
        <ListView 
          projects={projects} 
          tasks={tasks} 
          onTaskClick={openTaskModal}
          onTaskPatch={handleTaskPatch}
          onViewCompleted={handleViewCompleted}
        />
      ) : (
      <div className="kanban-board" style={{ padding: '32px', gap: '32px', overflowY: 'hidden', height: 'calc(100vh - 64px)' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          measuring={{
            droppable: {
              strategy: 0, // Rect
            },
          }}
        >
          <SortableContext
            items={projects.map(p => p.id)}
            strategy={horizontalListSortingStrategy}
          >
            {projects.map(project => {
              const projectTasks = sortTasks(tasks.filter(t => t.project_id === project.id && t.status !== 'Done'))
              return (
                <div key={project.id} style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: '340px' }}>
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
                      onViewCompleted={handleViewCompleted}
                    />
                  </SortableContext>
                  <button
                    onClick={() => handleSummarizeProject(project)}
                    className="btn-ghost"
                    style={{ 
                      marginTop: '16px', 
                      fontSize: '10px', 
                      fontWeight: '800',
                      letterSpacing: '0.1em',
                      padding: '12px', 
                      width: '100%', 
                      border: '1px dashed var(--border-strong)',
                      color: 'var(--text-disabled)'
                    }}
                  >
                    <Zap size={12} color="var(--accent)" style={{ marginRight: '8px' }} />
                    Summarize Project
                  </button>
                </div>
              )
            })}
          </SortableContext>

          <DragOverlay 
            dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: '0.4',
                  },
                },
              }),
            }}
          >
            {(() => {
              if (!activeTaskId) return null
              const t = tasks.find(t => t.id === activeTaskId)
              if (!t) return null
              return (
                <div style={{ 
                  padding: '24px', 
                  background: 'var(--surface-raised)', 
                  border: '2px solid var(--accent)', 
                  borderRadius: '12px',
                  width: '340px',
                  boxShadow: '0 40px 80px rgba(0,0,0,0.9), 0 0 32px rgba(167, 139, 250, 0.18)',
                  transform: 'rotate(2.5deg) scale(1.03)',
                  cursor: 'grabbing',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontFamily: 'monospace', fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em' }}>
                      <Hash size={12} />
                      <span>RELOCATING_RESOURCE: {t.id.slice(0,8).toUpperCase()}</span>
                    </div>
                    <div style={{ background: 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '900' }}>
                      IN_FLIGHT
                    </div>
                  </div>
                  <div style={{ color: 'var(--text)', fontWeight: '700', fontSize: '15px', lineHeight: '1.4' }}>{t.summary}</div>
                  <div style={{ height: '1px', background: 'var(--border-strong)', opacity: 0.3 }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-disabled)', fontFamily: 'monospace' }}>RECALIBRATING_VECTORS...</div>
                    <GripVertical size={14} color="var(--accent)" />
                  </div>
                </div>
              )
            })()}
          </DragOverlay>
        </DndContext>
      </div>
      )}

      {/* Completed Tasks Modal */}
      {completedTasksProject && (
        <div 
          className="modal-overlay"
          onClick={(e) => e.target.classList.contains('modal-overlay') && setCompletedTasksProject(null)}
        >
          <div className="modal-content" style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              background: 'var(--surface-alt)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <History size={18} color="var(--text-muted)" />
                <h3 style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                  COMPLETED ARCHIVE: {completedTasksProject.name.toUpperCase()}
                </h3>
              </div>
              <button onClick={() => setCompletedTasksProject(null)} className="btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks
                .filter(t => t.project_id === completedTasksProject.id && t.status === 'Done')
                .sort((a, b) => {
                  const dateA = a.completed_at || a.updated_at || a.created_at
                  const dateB = b.completed_at || b.updated_at || b.created_at
                  return new Date(dateB) - new Date(dateA)
                })
                .map(task => (
                  <div key={task.id} style={{ 
                    padding: '12px 16px', 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border-strong)',
                    borderRadius: '8px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    opacity: 0.7
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Check size={16} color="var(--success)" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-disabled)', textDecoration: 'line-through' }}>{task.summary}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          {(() => {
                            const d = new Date(task.completed_at || task.created_at)
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                          })()}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRestoreTask(task.id)}
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '11px', gap: '6px', color: 'var(--accent)' }}
                    >
                      <RefreshCcw size={12} />
                      Restore
                    </button>
                  </div>
                ))
              }
              {tasks.filter(t => t.project_id === completedTasksProject.id && t.status === 'Done').length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-disabled)', fontSize: '12px', padding: '32px' }}>
                  No completed tasks found in archive.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

function X({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )
}
