'use client';

import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function TaskCard({ task, onClick, onTaskPatch }) {
  const [localTask, setLocalTask] = useState(task)

  useEffect(() => { setLocalTask(task) }, [task])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const getPriorityInfo = (t) => {
    if (t.urgent && t.important) return { label: 'Urgent & Important', class: 'priority-urgent-important' }
    if (t.urgent) return { label: 'Urgent', class: 'priority-urgent' }
    if (t.important) return { label: 'Important', class: 'priority-important' }
    return { label: 'Neither', class: 'priority-none' }
  }

  const priority = getPriorityInfo(localTask)
  const isDone = localTask.status === 'Done'

  const patchTask = async (updates) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const serverTask = await res.json()
    if (!serverTask.error) {
      setLocalTask(serverTask)         // reconcile with server (picks up completed_at etc.)
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
      style={style}
      {...attributes}
      className={`task-card ${priority.class}${isDone ? ' task-done' : ''}`}
      onClick={() => onClick(task)}
    >
      <div className="task-card-header">
        <div
          {...listeners}
          className="task-card-grip"
          onClick={e => e.stopPropagation()}
          title="Drag to move"
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
            <circle cx="2" cy="2" r="1.4"/>
            <circle cx="8" cy="2" r="1.4"/>
            <circle cx="2" cy="6" r="1.4"/>
            <circle cx="8" cy="6" r="1.4"/>
            <circle cx="2" cy="10" r="1.4"/>
            <circle cx="8" cy="10" r="1.4"/>
          </svg>
        </div>
        <div className={`task-priority-tag ${priority.class}`}>{priority.label}</div>
        <button
          className={`task-done-btn${isDone ? ' done' : ''}`}
          onClick={handleToggleDone}
          title={isDone ? 'Mark as In Progress' : 'Mark as Done'}
        >
          {isDone && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,6 5,9 10,3"/>
            </svg>
          )}
        </button>
      </div>

      <div className="task-summary" style={{ fontSize: '13px', fontWeight: '500', lineHeight: '1.5', color: 'var(--text)' }}>
        {localTask.summary}
      </div>

      <div className="task-card-footer">
        <div className="task-flags">
          <button
            className={`task-flag-btn${localTask.urgent ? ' urgent-active' : ''}`}
            onClick={e => handleToggleFlag(e, 'urgent')}
            title="Toggle Urgent"
          >U</button>
          <button
            className={`task-flag-btn${localTask.important ? ' important-active' : ''}`}
            onClick={e => handleToggleFlag(e, 'important')}
            title="Toggle Important"
          >I</button>
        </div>
        {localTask.status === 'KIV' && (
          <div className="task-status-badge">KIV</div>
        )}
      </div>
    </div>
  )
}
