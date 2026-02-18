'use client';

import { useState } from 'react'
import TaskCard from './TaskCard'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  GripVertical,
  Settings2,
  ArrowDownAZ,
  X,
  Loader2,
  Activity,
  ArrowRight,
  History
} from 'lucide-react'

export default function ProjectColumn({ project, tasks, onTaskClick, onTasksUpdated, onTaskPatch, onViewCompleted }) {
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTaskSummary, setNewTaskSummary] = useState('')
  const [newTaskUrgent, setNewTaskUrgent] = useState(false)
  const [newTaskImportant, setNewTaskImportant] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef: setColumnRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.id })

  const columnStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    minWidth: '340px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    overflow: 'hidden'
  }

  const { setNodeRef: setTasksDropRef, isOver } = useDroppable({ id: `col:${project.id}` })

  const handleOpenCreate = () => {
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
      onTasksUpdated()
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSortByPriority = async () => {
    try {
      setLoading(true)
      const sortedTasks = [...tasks].sort((a, b) => {
        const scoreA = (a.urgent ? 2 : 0) + (a.important ? 1 : 0)
        const scoreB = (b.urgent ? 2 : 0) + (b.important ? 1 : 0)
        if (scoreA !== scoreB) return scoreB - scoreA
        return a.order_index - b.order_index
      })

      const updates = sortedTasks.map((task, index) =>
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: index }),
        })
      )
      await Promise.all(updates)
      onTasksUpdated()
    } catch (err) {
      alert('Sort Error: ' + err.message)
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
      <div ref={setColumnRef} style={columnStyle} className="kanban-column">
        {/* Technical Project Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${isOver ? 'var(--accent)' : 'var(--border-strong)'}`,
          background: isOver ? 'var(--accent-subtle)' : 'var(--surface-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              {...attributes}
              {...listeners}
              style={{
                cursor: 'grab',
                color: 'var(--text-disabled)',
                display: 'flex',
                padding: '6px',
                borderRadius: '4px',
                background: 'var(--background)',
                border: '1px solid var(--border)'
              }}
            >
              <GripVertical size={14} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: isOver ? 'var(--accent-hover)' : 'var(--accent)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: '4px' }}>
                ID: {project.id.slice(0,8).toUpperCase()}
              </div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: '700',
                color: isOver ? 'var(--accent)' : 'var(--text)',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {project.name}
              </h3>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--background)',
            padding: '4px 10px',
            borderRadius: '8px',
            border: `1px solid ${isOver ? 'var(--accent)' : 'var(--border)'}`,
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: '700',
            color: isOver ? 'var(--accent)' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}>
            <Activity size={12} />
            <span>{tasks.length.toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Control Strip */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
          background: 'var(--background)'
        }}>
           <button
            onClick={() => onViewCompleted(project)}
            className="btn-ghost"
            style={{ padding: '6px', border: '1px solid var(--border-strong)', color: 'var(--text-disabled)' }}
            title="History"
          >
            <History size={12} />
          </button>
          <button
            onClick={handleSortByPriority}
            className="btn-ghost"
            style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', border: '1px solid var(--border-strong)' }}
            title="Optimize Vectors"
          >
            <ArrowDownAZ size={12} />
            <span style={{ marginLeft: '6px' }}>OPTIMIZE</span>
          </button>
          <a
            href={`/projects/${project.id}/settings`}
            className="btn-ghost"
            style={{ padding: '6px', border: '1px solid var(--border-strong)' }}
            title="Configuration"
          >
            <Settings2 size={12} />
          </a>
          <button
            onClick={handleOpenCreate}
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '11px', fontWeight: '800' }}
          >
            <Plus size={14} />
            ADD
          </button>
        </div>

        {/* Task Repository */}
        <div
          ref={setTasksDropRef}
          className="kanban-tasks"
          style={{
            padding: '16px',
            flexGrow: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: isOver ? 'var(--accent-subtle)' : 'transparent',
            transition: 'all 0.2s ease'
          }}
        >
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onTaskPatch={onTaskPatch}
            />
          ))}
          {tasks.length === 0 && (
            <div style={{
              height: '100px',
              border: '2px dashed var(--border-strong)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-disabled)',
              fontSize: '11px',
              fontFamily: 'monospace',
              letterSpacing: '0.05em'
            }}>
              No Active Task
            </div>
          )}
        </div>
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
