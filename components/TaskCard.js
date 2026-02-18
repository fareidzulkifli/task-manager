'use client';

import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Check } from 'lucide-react'

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
    opacity: isDragging ? 0.2 : 1,
    zIndex: isDragging ? 1000 : 1,
    cursor: 'pointer'
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

  const handleToggleFlag = (e, flag) => {
    e.stopPropagation()
    const newVal = !localTask[flag]
    setLocalTask(prev => ({ ...prev, [flag]: newVal }))
    patchTask({ [flag]: newVal })
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`task-card ${isDone ? 'task-done' : ''}`}
      onClick={() => onClick(task)}
      style={{
        ...style,
        background: 'var(--surface-alt)',
        border: '1px solid var(--border-strong)',
        borderRadius: '10px',
        padding: '14px 14px 14px 18px',
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      {/* Priority Strip */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: '3px',
        background: localTask.urgent && localTask.important ? 'var(--error)'
                  : localTask.urgent ? 'var(--warning)'
                  : localTask.important ? 'var(--accent)'
                  : 'transparent'
      }} />

      {/* Summary + Drag Handle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{
          flex: 1,
          fontSize: '14px',
          fontWeight: '600',
          lineHeight: '1.55',
          color: isDone ? 'var(--text-disabled)' : 'var(--text)',
          textDecoration: isDone ? 'line-through' : 'none',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
          overflow: 'hidden'
        }}>
          {localTask.summary}
        </div>

        <div
          {...listeners}
          onClick={e => e.stopPropagation()}
          style={{
            flexShrink: 0,
            marginTop: '2px',
            color: 'var(--text-disabled)',
            cursor: 'grab',
            display: 'flex',
            opacity: 0.5
          }}
        >
          <GripVertical size={13} />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '10px',
        borderTop: '1px solid var(--border)'
      }}>
        {/* Priority chips */}
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
              background: localTask.urgent ? 'var(--warning-muted)' : 'transparent',
              color: localTask.urgent ? 'var(--warning)' : 'var(--text-disabled)',
              border: `1px solid ${localTask.urgent ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-strong)'}`,
              transition: 'all 0.12s'
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
              background: localTask.important ? 'var(--accent-muted)' : 'transparent',
              color: localTask.important ? 'var(--accent)' : 'var(--text-disabled)',
              border: `1px solid ${localTask.important ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-strong)'}`,
              transition: 'all 0.12s'
            }}
          >
            I
          </button>
        </div>

        {/* Done toggle */}
        <button
          onClick={handleToggleDone}
          title={isDone ? 'Reactivate' : 'Mark complete'}
          style={{
            padding: '3px 10px',
            borderRadius: '5px',
            border: `1px solid ${isDone ? 'var(--success)' : 'var(--border-strong)'}`,
            background: isDone ? 'var(--success-muted)' : 'transparent',
            color: isDone ? 'var(--success)' : 'var(--text-disabled)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '0.04em',
            transition: 'all 0.15s'
          }}
        >
          <Check size={11} strokeWidth={isDone ? 3 : 1.5} />
          <span>Done</span>
        </button>
      </div>
    </div>
  )
}
