'use client';

import { useState } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  MoreHorizontal, 
  Maximize2,
  Clock,
  FileText,
  Paperclip,
  Plus,
  X,
  Loader2,
  ArrowRight,
  History
} from 'lucide-react'

export default function ListView({ projects, tasks, onTaskClick, onTaskPatch, onViewCompleted }) {
  // Global headers
  const headers = [
    { label: 'Status', width: '48px', align: 'center' },
    { label: 'Task', width: 'minmax(300px, 2fr)', align: 'left' },
    { label: 'Priority', width: '120px', align: 'left' },
    { label: 'Due Date', width: '140px', align: 'left' },
    { label: 'Actions', width: '80px', align: 'right' }
  ]

  return (
    <div className="list-view" style={{ 
      padding: '0 32px 32px 32px', 
      height: 'calc(100vh - 64px)', 
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Global List Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '48px minmax(300px, 2fr) 120px 140px 80px',
        padding: '0 16px',
        marginBottom: '-12px',
        marginTop: '24px'
      }}>
        {headers.map((h, i) => (
          <div key={i} style={{
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-disabled)',
            textAlign: h.align,
            display: 'flex',
            alignItems: 'center',
            justifyContent: h.align === 'center' ? 'center' : h.align === 'right' ? 'flex-end' : 'flex-start'
          }}>
            {h.label}
          </div>
        ))}
      </div>

      {projects.map(project => {
        // Filter out 'Done' tasks for the main view
        const projectTasks = tasks.filter(t => t.project_id === project.id && t.status !== 'Done')
          .sort((a, b) => a.order_index - b.order_index)

        return (
          <ProjectGroup 
            key={project.id} 
            project={project} 
            tasks={projectTasks} 
            onTaskClick={onTaskClick}
            onTaskPatch={onTaskPatch}
            onViewCompleted={() => onViewCompleted(project)}
          />
        )
      })}
      
      {projects.length === 0 && (
        <div style={{ 
          padding: '48px', 
          textAlign: 'center', 
          border: '1px dashed var(--border-strong)', 
          borderRadius: '12px',
          color: 'var(--text-disabled)',
          fontSize: '13px'
        }}>
          No projects found. Create a project to get started.
        </div>
      )}
    </div>
  )
}

function ProjectGroup({ project, tasks, onTaskClick, onTaskPatch, onViewCompleted }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTaskSummary, setNewTaskSummary] = useState('')
  const [newTaskUrgent, setNewTaskUrgent] = useState(false)
  const [newTaskImportant, setNewTaskImportant] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleOpenCreate = (e) => {
    e.stopPropagation()
    setNewTaskSummary('')
    setNewTaskUrgent(false)
    setNewTaskImportant(false)
    setShowCreateModal(true)
  }

  const handleCreateTask = async () => {
    if (!newTaskSummary.trim()) return
    try {
      setLoading(true)
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: newTaskSummary.trim(),
          project_id: project.id,
          order_index: tasks.length,
          urgent: newTaskUrgent,
          important: newTaskImportant,
        }),
      })
      const newTask = await res.json()
      if (newTask.error) throw new Error(newTask.error)
      setShowCreateModal(false)
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const priorityBorderColor =
    newTaskUrgent && newTaskImportant ? 'var(--error)' :
    newTaskUrgent ? 'var(--warning)' :
    newTaskImportant ? 'var(--accent)' :
    'var(--border-strong)'

  return (
    <>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: isExpanded ? 'var(--shadow-md)' : 'none'
      }}>
        {/* Project Header Row */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '12px 16px',
            background: 'var(--surface-alt)',
            borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'background 0.15s ease'
          }}
          className="project-row-header"
        >
          <div style={{ 
            color: 'var(--text-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '20px',
            height: '20px'
          }}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '700', 
            color: 'var(--text)', 
            letterSpacing: '-0.01em' 
          }}>
            {project.name}
          </div>

          <div style={{
            fontSize: '10px',
            fontWeight: '600',
            color: 'var(--text-disabled)',
            background: 'var(--background)',
            padding: '2px 8px',
            borderRadius: '10px',
            border: '1px solid var(--border-strong)'
          }}>
            {tasks.length} TASKS
          </div>

          <div style={{ flexGrow: 1 }} />
          
          {/* Right Side Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Completed Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onViewCompleted(); }}
              className="btn-ghost"
              style={{
                padding: '4px 8px',
                height: '24px',
                fontSize: '10px',
                border: '1px solid var(--border-strong)',
                borderRadius: '6px',
                color: 'var(--text-disabled)'
              }}
              title="View Completed Tasks"
            >
              <History size={12} />
              <span style={{ fontWeight: '700' }}>HISTORY</span>
            </button>

            {/* Add Task Button */}
            <button
              onClick={handleOpenCreate}
              className="btn-ghost"
              style={{ 
                padding: '4px 8px', 
                height: '24px', 
                fontSize: '10px',
                border: '1px solid var(--border-strong)',
                borderRadius: '6px'
              }}
            >
              <Plus size={12} />
              <span style={{ fontWeight: '700' }}>ADD TASK</span>
            </button>
          </div>
        </div>

        {/* Task Rows */}
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tasks.map(task => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onTaskClick={onTaskClick}
                onTaskPatch={onTaskPatch}
              />
            ))}
            {tasks.length === 0 && (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                fontSize: '11px', 
                color: 'var(--text-disabled)', 
                fontStyle: 'italic' 
              }}>
                No active tasks
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Task Creation Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target.classList.contains('modal-overlay') && setShowCreateModal(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowCreateModal(false)}
        >
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            width: '100%',
            maxWidth: '520px',
            overflow: 'hidden',
            borderRight: '1px solid var(--border-strong)',
            borderBottom: '1px solid var(--border-strong)',
            borderLeft: '1px solid var(--border-strong)',
            borderTop: `2px solid ${priorityBorderColor}`,
            transition: 'border-top-color 0.2s ease'
          }}>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px',
              background: 'var(--surface-alt)',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-muted)', border: '1px solid var(--accent-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Plus size={14} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--text)' }}>New Task Allocation</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginTop: '2px' }}>
                    {project.name.toUpperCase()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-ghost"
                style={{ padding: '6px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Summary Input */}
              <div>
                <label style={{
                  display: 'block', fontSize: '10px', fontWeight: '800',
                  color: 'var(--text-disabled)', textTransform: 'uppercase',
                  letterSpacing: '0.15em', marginBottom: '10px'
                }}>
                  Task Summary
                </label>
                <textarea
                  autoFocus
                  value={newTaskSummary}
                  onChange={e => setNewTaskSummary(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateTask(); }
                  }}
                  placeholder="Describe the task objective..."
                  rows={3}
                  style={{
                    resize: 'none',
                    fontSize: '15px',
                    fontWeight: '500',
                    lineHeight: '1.6',
                    background: 'var(--background)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    color: 'var(--text)',
                    width: '100%'
                  }}
                />
              </div>

              {/* Priority Flags */}
              <div>
                <label style={{
                  display: 'block', fontSize: '10px', fontWeight: '800',
                  color: 'var(--text-disabled)', textTransform: 'uppercase',
                  letterSpacing: '0.15em', marginBottom: '10px'
                }}>
                  Priority Flags
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>

                  {/* Urgent */}
                  <button
                    onClick={() => setNewTaskUrgent(v => !v)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      gap: '8px', padding: '14px', borderRadius: 'var(--radius-md)',
                      background: newTaskUrgent ? 'var(--warning-muted)' : 'var(--background)',
                      border: `1px solid ${newTaskUrgent ? 'rgba(245,158,11,0.45)' : 'var(--border-strong)'}`,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      color: newTaskUrgent ? 'var(--warning)' : 'var(--text-disabled)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: 'var(--radius-sm)',
                        background: newTaskUrgent ? 'rgba(245,158,11,0.2)' : 'var(--surface-alt)',
                        border: `1px solid ${newTaskUrgent ? 'rgba(245,158,11,0.4)' : 'var(--border-strong)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: '900', fontFamily: 'var(--font-mono)',
                        transition: 'all 0.15s',
                        color: newTaskUrgent ? 'var(--warning)' : 'var(--text-disabled)'
                      }}>U</div>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: newTaskUrgent ? 'var(--warning)' : 'var(--border-strong)',
                        transition: 'background 0.15s', flexShrink: 0
                      }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.06em' }}>URGENT</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-disabled)', marginTop: '2px', fontWeight: '400' }}>Time-sensitive</div>
                    </div>
                  </button>

                  {/* Important */}
                  <button
                    onClick={() => setNewTaskImportant(v => !v)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      gap: '8px', padding: '14px', borderRadius: 'var(--radius-md)',
                      background: newTaskImportant ? 'var(--accent-muted)' : 'var(--background)',
                      border: `1px solid ${newTaskImportant ? 'rgba(99,102,241,0.45)' : 'var(--border-strong)'}`,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      color: newTaskImportant ? 'var(--accent)' : 'var(--text-disabled)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: 'var(--radius-sm)',
                        background: newTaskImportant ? 'var(--accent-subtle)' : 'var(--surface-alt)',
                        border: `1px solid ${newTaskImportant ? 'rgba(99,102,241,0.4)' : 'var(--border-strong)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: '900', fontFamily: 'var(--font-mono)',
                        transition: 'all 0.15s',
                        color: newTaskImportant ? 'var(--accent)' : 'var(--text-disabled)'
                      }}>I</div>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: newTaskImportant ? 'var(--accent)' : 'var(--border-strong)',
                        transition: 'background 0.15s', flexShrink: 0
                      }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.06em' }}>IMPORTANT</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-disabled)', marginTop: '2px', fontWeight: '400' }}>High impact</div>
                    </div>
                  </button>
                </div>

                {/* Quadrant label — shown when any flag active */}
                {(newTaskUrgent || newTaskImportant) && (
                  <div style={{
                    marginTop: '10px', padding: '7px 12px', borderRadius: 'var(--radius-sm)',
                    background: newTaskUrgent && newTaskImportant ? 'var(--error-muted)' : newTaskUrgent ? 'var(--warning-muted)' : 'var(--accent-subtle)',
                    border: `1px solid ${newTaskUrgent && newTaskImportant ? 'rgba(239,68,68,0.25)' : newTaskUrgent ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.2)'}`,
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <div style={{
                      width: '4px', height: '4px', borderRadius: '50%', flexShrink: 0,
                      background: newTaskUrgent && newTaskImportant ? 'var(--error)' : newTaskUrgent ? 'var(--warning)' : 'var(--accent)'
                    }} />
                    <span style={{
                      fontSize: '10px', fontWeight: '800', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                      color: newTaskUrgent && newTaskImportant ? 'var(--error)' : newTaskUrgent ? 'var(--warning)' : 'var(--accent)'
                    }}>
                      {newTaskUrgent && newTaskImportant ? 'QUADRANT I — DO FIRST'
                        : newTaskUrgent ? 'QUADRANT III — DELEGATE'
                        : 'QUADRANT II — SCHEDULE'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'flex-end', gap: '8px',
              background: 'var(--surface-alt)'
            }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-ghost"
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                Abort
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTaskSummary.trim() || loading}
                className="btn-primary"
                style={{ fontSize: '12px', padding: '8px 20px', gap: '8px' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                Allocate Task
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TaskRow({ task, onTaskClick, onTaskPatch }) {
  const [isRowExpanded, setIsRowExpanded] = useState(false)
  const isDone = task.status === 'Done'

  const patchTask = async (updates) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const serverTask = await res.json()
      if (!serverTask.error) {
        onTaskPatch(task.id, serverTask)
      }
    } catch (err) {
      console.error('Failed to patch task:', err)
      alert('Failed to update task')
    }
  }

  const handleToggleDone = (e) => {
    e.stopPropagation()
    const newStatus = isDone ? 'In Progress' : 'Done'
    // Optimistic update
    onTaskPatch(task.id, { status: newStatus })
    patchTask({ status: newStatus })
  }

  const handleToggleFlag = (e, flag) => {
    e.stopPropagation()
    const newVal = !task[flag]
    // Optimistic update
    onTaskPatch(task.id, { [flag]: newVal })
    patchTask({ [flag]: newVal })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderBottom: '1px solid var(--border-subtle)',
      background: isRowExpanded ? 'var(--surface-raised)' : 'transparent',
      transition: 'background 0.15s ease'
    }}>
      {/* Main Row Content */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '48px minmax(300px, 2fr) 120px 140px 80px',
          alignItems: 'center',
          padding: '12px 16px',
          minHeight: '48px',
          cursor: 'pointer'
        }}
        className="task-row"
        onClick={() => setIsRowExpanded(!isRowExpanded)}
      >
        {/* Status */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleToggleDone}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              color: isDone ? 'var(--success)' : 'var(--text-disabled)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isDone ? <CheckCircle2 size={18} fill="var(--success-muted)" /> : <Circle size={18} />}
          </button>
        </div>

        {/* Task Title */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          paddingRight: '16px'
        }}>
          <span style={{ 
            fontSize: '13px', 
            fontWeight: isDone ? '400' : '600', 
            color: isDone ? 'var(--text-disabled)' : 'var(--text)',
            textDecoration: isDone ? 'line-through' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {task.summary}
          </span>
          {task.notes_markdown && <FileText size={12} color="var(--text-disabled)" />}
        </div>

        {/* Priority */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={(e) => handleToggleFlag(e, 'urgent')}
            title="Toggle Urgency"
            style={{
              padding: '3px 8px',
              fontSize: '9px',
              fontWeight: '800',
              letterSpacing: '0.06em',
              borderRadius: '4px',
              background: task.urgent ? 'var(--warning-muted)' : 'transparent',
              color: task.urgent ? 'var(--warning)' : 'var(--text-disabled)',
              border: `1px solid ${task.urgent ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-strong)'}`,
              transition: 'all 0.12s',
              cursor: 'pointer'
            }}
          >
            U
          </button>
          <button
            onClick={(e) => handleToggleFlag(e, 'important')}
            title="Toggle Importance"
            style={{
              padding: '3px 8px',
              fontSize: '9px',
              fontWeight: '800',
              letterSpacing: '0.06em',
              borderRadius: '4px',
              background: task.important ? 'var(--accent-muted)' : 'transparent',
              color: task.important ? 'var(--accent)' : 'var(--text-disabled)',
              border: `1px solid ${task.important ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-strong)'}`,
              transition: 'all 0.12s',
              cursor: 'pointer'
            }}
          >
            I
          </button>
        </div>

        {/* Due Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: task.due_date ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>
          {task.due_date ? (
            <>
              <Calendar size={12} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{task.due_date}</span>
            </>
          ) : (
            <span style={{ opacity: 0.3 }}>—</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
            className="btn-ghost"
            style={{ padding: '6px', height: 'auto' }}
            title="Open Details"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded Details Row */}
      {isRowExpanded && (
        <div style={{
          padding: '0 16px 16px 64px', // indented to align with text
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          cursor: 'default'
        }}>
          {/* Notes Snippet */}
          {task.notes_markdown && (
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              background: 'var(--background)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              maxWidth: '80%'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-disabled)', marginBottom: '4px', textTransform: 'uppercase' }}>Notes Snippet</div>
              {task.notes_markdown.slice(0, 300) + (task.notes_markdown.length > 300 ? '...' : '')}
            </div>
          )}

          {/* Quick Actions Bar */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => onTaskClick(task)}
              className="btn-primary"
              style={{ fontSize: '11px', padding: '6px 12px', height: '28px' }}
            >
              Full Details
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
