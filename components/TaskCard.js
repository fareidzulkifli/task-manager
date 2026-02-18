'use client';

import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Check, Clock, AlertCircle } from 'lucide-react'

export default function TaskCard({ task, onClick, onTaskPatch }) {
  const [localTask, setLocalTask] = useState(task)

  useEffect(() => { setLocalTask(task) }, [task])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 1,
  }

  const isDone = localTask.status === 'Done'

  const patchTask = async (updates) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const serverTask = await res.json()
    if (!serverTask.error) {
      setLocalTask(serverTask)
      onTaskPatch?.(task.id, serverTask)
    }
    window.dispatchEvent(new Event('taskUpdated'))
  }

  const handleToggleDone = (e) => {
    e.stopPropagation()
    const newStatus = isDone ? 'In Progress' : 'Done'
    setLocalTask(prev => ({ ...prev, status: newStatus }))
    patchTask({ status: newStatus })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`task-card animate-fade-in ${isDone ? 'task-done' : ''}`}
      onClick={() => onClick(task)}
    >
      <div className="task-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            {...listeners}
            className="task-card-grip"
            onClick={e => e.stopPropagation()}
            style={{ color: 'var(--text-disabled)', cursor: 'grab' }}
          >
            <GripVertical size={14} />
          </div>
          <div className="task-meta">
            {localTask.urgent && <span style={{ color: 'var(--warning)', display: 'flex' }} title="Urgent"><AlertCircle size={12} /></span>}
            {localTask.important && <span style={{ color: 'var(--accent)', display: 'flex' }} title="Important"><Clock size={12} /></span>}
          </div>
        </div>
        
        <button
          onClick={handleToggleDone}
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

      <div className={`task-summary ${isDone ? 'text-muted' : ''}`} style={{ 
        textDecoration: isDone ? 'line-through' : 'none',
        opacity: isDone ? 0.6 : 1
      }}>
        {localTask.summary}
      </div>

      <div className="task-card-footer">
        <div className="task-meta">
          {localTask.status !== 'Done' && (
            <span className="badge" style={{ fontSize: '10px', padding: '1px 6px' }}>
              {localTask.status}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
