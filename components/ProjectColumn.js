'use client';

import { useState } from 'react'
import TaskCard from './TaskCard'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, Settings2, ArrowDownAZ, MoreHorizontal } from 'lucide-react'

export default function ProjectColumn({ project, tasks, onTaskClick, onTasksUpdated, onTaskPatch }) {
  const [loading, setLoading] = useState(false)

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
    opacity: isDragging ? 0.5 : 1,
  }

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
    <div ref={setColumnRef} style={columnStyle} className="kanban-column animate-fade-in">
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <div
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'var(--text-disabled)' }}
          >
            <GripVertical size={16} />
          </div>
          <span>{project.name}</span>
          <span className="kanban-column-count">{tasks.length}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={handleSortByPriority}
            className="btn-ghost" 
            style={{ padding: '6px' }}
            title="Sort by priority"
          >
            <ArrowDownAZ size={14} />
          </button>
          <a 
            href={`/projects/${project.id}/settings`}
            className="btn-ghost"
            style={{ padding: '6px' }}
          >
            <Settings2 size={14} />
          </a>
          <button 
            onClick={handleCreateTask}
            className="btn-primary" 
            style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

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
