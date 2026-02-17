'use client';

import { useState } from 'react'
import TaskCard from './TaskCard'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

export default function ProjectColumn({ project, tasks, onTaskClick, onTasksUpdated, onTaskPatch }) {
  const [loading, setLoading] = useState(false)

  // Makes this column draggable as a whole (horizontal project reorder)
  const {
    attributes,
    listeners,
    setNodeRef: setColumnRef,
    transform,
    transition,
  } = useSortable({ id: project.id })

  const columnStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  // Makes the task-list area a drop target so tasks can be dropped into
  // empty columns (the SortableContext above handles non-empty columns)
  const { setNodeRef: setTasksDropRef } = useDroppable({ id: `col:${project.id}` })

  const handleCreateTask = async () => {
    const summary = prompt('Task Summary:')
    if (!summary) return

    try {
      setLoading(true)
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          project_id: project.id,
          order_index: tasks.length,
        }),
      })
      const newTask = await res.json()
      if (newTask.error) throw new Error(newTask.error)
      onTasksUpdated()
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      alert('Error creating task: ' + err.message)
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
      alert('Error sorting tasks: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={setColumnRef} style={columnStyle} className="kanban-column">
      <div className="kanban-column-header">
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </div>
        <h3 style={{ fontSize: '13px', fontWeight: '600', flexGrow: 1, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.name}
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <a
            href={`/projects/${project.id}/settings`}
            style={{ display: 'flex', alignItems: 'center', padding: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', border: '1px solid var(--border-strong)', transition: 'color 0.15s, background 0.15s' }}
            title="Project Settings"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </a>
          <button
            onClick={handleSortByPriority}
            disabled={loading}
            className="btn-ghost"
            style={{ padding: '4px 8px', fontSize: '10px' }}
          >
            Sort
          </button>
          <button
            onClick={handleCreateTask}
            disabled={loading}
            style={{ padding: '4px 10px', fontSize: '16px', lineHeight: 1 }}
          >
            +
          </button>
        </div>
      </div>

      {/* ref from useDroppable ensures empty columns are valid drop targets */}
      <div ref={setTasksDropRef} className="kanban-tasks">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onTaskPatch={onTaskPatch}
          />
        ))}
      </div>
    </div>
  )
}
