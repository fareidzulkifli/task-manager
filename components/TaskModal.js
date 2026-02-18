'use client';

import { useState, useEffect } from 'react'
import {
  X,
  FileText,
  Paperclip,
  Sparkles,
  Trash2,
  Calendar,
  Download,
  Loader2,
  Activity
} from 'lucide-react'

export default function TaskModal({ task, onClose, onTaskUpdated, onTaskPatch, projectContext }) {
  const [editedTask, setEditedTask] = useState(task)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('notes')
  const [previewMarkdown, setPreviewMarkdown] = useState(false)

  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)

  const [attachments, setAttachments] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    if (task) {
      setEditedTask(task)
      fetchAttachments()
    }
  }, [task])

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAttachments(data)
    } catch (err) {
      console.error('Error fetching attachments:', err)
    }
  }

  const handleSave = async (data = editedTask) => {
    try {
      setIsSaving(true)
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      onTaskPatch?.(task.id, result)
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      alert('Error saving task: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAiSummarize = async () => {
    try {
      setAiLoading(true)
      const res = await fetch('/api/ai/task-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editedTask.notes_markdown })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiSuggestion({ type: 'summary', content: data.summary })
    } catch (err) {
      alert('AI Error: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiPriority = async () => {
    try {
      setAiLoading(true)
      const res = await fetch('/api/ai/task-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: editedTask.summary,
          notes: editedTask.notes_markdown,
          project_context: JSON.stringify(projectContext)
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiSuggestion({ type: 'priority', content: data })
    } catch (err) {
      alert('AI Error: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const applyAiSuggestion = async () => {
    if (!aiSuggestion) return
    let updatedTask = { ...editedTask }
    if (aiSuggestion.type === 'summary') {
      updatedTask.summary = aiSuggestion.content
    } else if (aiSuggestion.type === 'priority') {
      updatedTask.urgent = aiSuggestion.content.urgent
      updatedTask.important = aiSuggestion.content.important
    }
    setEditedTask(updatedTask)
    await handleSave(updatedTask)
    setAiSuggestion(null)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      setUploadingFile(true)
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      })
      const { signedUrl, key } = await presignRes.json()
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      if (!uploadRes.ok) throw new Error('Upload to R2 failed')
      const attachRes = await fetch(`/api/tasks/${task.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name, r2_key: key, mime_type: file.type, size_bytes: file.size
        })
      })
      const newAttachment = await attachRes.json()
      setAttachments([...attachments, newAttachment])
    } catch (err) {
      alert('Upload error: ' + err.message)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteAttachment = async (id) => {
    if (!confirm('Delete this attachment?')) return
    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments?attachment_id=${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      setAttachments(attachments.filter(a => a.id !== id))
    } catch (err) {
      alert('Error deleting attachment: ' + err.message)
    }
  }

  const handleDeleteTask = async () => {
    if (!confirm('Delete this task?')) return
    try {
      setIsSaving(true)
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      onTaskUpdated()
      onClose()
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      alert('Error deleting task: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const priorityBorderColor =
    editedTask.urgent && editedTask.important ? 'var(--error)' :
    editedTask.urgent ? 'var(--warning)' :
    editedTask.important ? 'var(--accent)' :
    'var(--border-strong)'

  const quadrants = [
    { urgent: true,  important: true,  label: 'DO',        sub: 'Urgent · Important', color: 'var(--error)',         bg: 'var(--error-muted)'   },
    { urgent: false, important: true,  label: 'SCHEDULE',  sub: 'Important only',     color: 'var(--accent)',        bg: 'var(--accent-subtle)' },
    { urgent: true,  important: false, label: 'DELEGATE',  sub: 'Urgent only',        color: 'var(--warning)',       bg: 'var(--warning-muted)' },
    { urgent: false, important: false, label: 'ELIMINATE', sub: 'Neither',            color: 'var(--text-disabled)', bg: 'transparent'          },
  ]

  return (
    <div
      className="modal-overlay"
      style={{ alignItems: 'flex-start', paddingTop: '4vh' }}
      onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}
    >
      <div style={{
        maxWidth: '1060px',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '88vh',
        background: 'var(--background)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border-strong)',
        borderTop: `2px solid ${priorityBorderColor}`,
        transition: 'border-top-color 0.2s ease'
      }}>

        {/* Top Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          height: '48px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: 'var(--text-disabled)',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-mono)'
            }}>
              {projectContext?.name?.toUpperCase() || 'UNASSIGNED'}
            </span>
            {isSaving && (
              <>
                <div style={{ width: '1px', height: '12px', background: 'var(--border-strong)' }} />
                <Loader2 className="animate-spin" size={12} color="var(--accent)" />
              </>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px', borderRadius: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>

          {/* Main Content */}
          <div style={{
            flexGrow: 1,
            overflowY: 'auto',
            padding: '32px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Title */}
            <input
              value={editedTask.summary}
              onChange={e => setEditedTask({ ...editedTask, summary: e.target.value })}
              onBlur={() => handleSave()}
              placeholder="Task summary"
              style={{
                fontSize: '26px',
                fontWeight: '700',
                background: 'transparent',
                border: 'none',
                padding: '0',
                boxShadow: 'none',
                letterSpacing: '-0.03em',
                color: 'var(--text)',
                width: '100%'
              }}
            />

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '0' }}>
              {['notes', 'files'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
                    marginBottom: '-1px',
                    padding: '10px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: activeTab === tab ? 'var(--text)' : 'var(--text-disabled)',
                    cursor: 'pointer',
                    transition: 'color 0.15s'
                  }}
                >
                  {tab === 'notes' ? 'Notes' : 'Files'}
                  {tab === 'files' && attachments.length > 0 && (
                    <span style={{
                      marginLeft: '6px',
                      fontSize: '9px',
                      fontWeight: '800',
                      background: 'var(--surface-alt)',
                      color: 'var(--text-disabled)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {attachments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Notes tab */}
            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setPreviewMarkdown(!previewMarkdown)}
                    className="btn-ghost"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    {previewMarkdown ? 'Edit' : 'Preview'}
                  </button>
                </div>
                {!previewMarkdown ? (
                  <textarea
                    value={editedTask.notes_markdown || ''}
                    onChange={e => setEditedTask({ ...editedTask, notes_markdown: e.target.value })}
                    onBlur={() => handleSave()}
                    placeholder="Add notes, context, acceptance criteria..."
                    style={{
                      flexGrow: 1,
                      minHeight: '320px',
                      background: 'transparent',
                      border: 'none',
                      padding: '0',
                      resize: 'none',
                      lineHeight: '1.75',
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                ) : (
                  <div style={{
                    lineHeight: '1.8',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    minHeight: '320px'
                  }}>
                    {editedTask.notes_markdown || 'Nothing written yet.'}
                  </div>
                )}
              </div>
            )}

            {/* Files tab */}
            {activeTab === 'files' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <input type="file" onChange={handleFileUpload} disabled={uploadingFile} id="file-upload" style={{ display: 'none' }} />
                  <label htmlFor="file-upload" className="btn-ghost" style={{ cursor: 'pointer', fontSize: '12px' }}>
                    {uploadingFile ? <Loader2 className="animate-spin" size={13} /> : <Paperclip size={13} />}
                    <span>Attach file</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {attachments.map(att => (
                    <div key={att.id} style={{
                      padding: '14px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'var(--background)', borderRadius: '4px', padding: '6px', display: 'flex', flexShrink: 0 }}>
                          <FileText size={14} color="var(--accent)" />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.filename}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{(att.size_bytes / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', paddingTop: '10px', gap: '6px' }}>
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ flexGrow: 1, fontSize: '11px', padding: '5px' }}>
                          <Download size={11} /> Download
                        </a>
                        <button onClick={() => handleDeleteAttachment(att.id)} className="btn-ghost" style={{ color: 'var(--error)', padding: '5px' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <div style={{
                      gridColumn: '1/-1',
                      textAlign: 'center',
                      padding: '48px',
                      border: '1px dashed var(--border-strong)',
                      borderRadius: '10px',
                      color: 'var(--text-disabled)',
                      fontSize: '12px'
                    }}>
                      No files attached
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{
            width: '260px',
            flexShrink: 0,
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            padding: '24px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            overflowY: 'auto'
          }}>

            {/* Status & Due Date */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Status</span>
              <select
                value={editedTask.status}
                onChange={e => {
                  const status = e.target.value
                  setEditedTask({ ...editedTask, status })
                  handleSave({ ...editedTask, status })
                }}
                style={{ background: 'var(--background)', fontWeight: '600', height: '36px', fontSize: '12px' }}
              >
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="KIV">KIV</option>
              </select>

              <div style={{ position: 'relative' }}>
                <Calendar size={13} style={{ position: 'absolute', left: '11px', top: '12px', color: 'var(--text-disabled)' }} />
                <input
                  type="date"
                  value={editedTask.due_date || ''}
                  onChange={e => {
                    const due_date = e.target.value || null
                    setEditedTask({ ...editedTask, due_date })
                    handleSave({ ...editedTask, due_date })
                  }}
                  style={{ paddingLeft: '32px', height: '36px', background: 'var(--background)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </section>

            {/* Priority */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Priority</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {quadrants.map(q => {
                  const isActive = editedTask.urgent === q.urgent && editedTask.important === q.important
                  return (
                    <button
                      key={q.label}
                      onClick={() => {
                        const next = { urgent: q.urgent, important: q.important }
                        setEditedTask({ ...editedTask, ...next })
                        handleSave({ ...editedTask, ...next })
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        background: isActive ? q.bg : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: isActive ? q.color : 'var(--border-strong)',
                        transition: 'background 0.12s'
                      }} />
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: isActive ? q.color : 'var(--text-disabled)' }}>{q.label}</div>
                        <div style={{ fontSize: '10px', color: isActive ? q.color : 'var(--border-strong)', opacity: 0.85, marginTop: '1px' }}>{q.sub}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* AI Assist */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>AI Assist</span>
                <Sparkles size={11} color="var(--accent)" />
              </div>

              {!aiSuggestion ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={handleAiSummarize}
                    disabled={aiLoading}
                    className="btn-ghost"
                    style={{ justifyContent: 'flex-start', background: 'var(--background)', fontSize: '12px', width: '100%', border: '1px solid var(--border-strong)' }}
                  >
                    {aiLoading ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
                    Optimize Summary
                  </button>
                  <button
                    onClick={handleAiPriority}
                    disabled={aiLoading}
                    className="btn-ghost"
                    style={{ justifyContent: 'flex-start', background: 'var(--background)', fontSize: '12px', width: '100%', border: '1px solid var(--border-strong)' }}
                  >
                    {aiLoading ? <Loader2 className="animate-spin" size={13} /> : <Activity size={13} />}
                    Evaluate Priority
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    background: 'var(--background)',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)'
                  }}>
                    {aiSuggestion.type === 'summary' ? aiSuggestion.content : aiSuggestion.content.reasoning}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={applyAiSuggestion} className="btn-primary" style={{ flexGrow: 1, fontSize: '11px', padding: '7px' }}>Apply</button>
                    <button onClick={() => setAiSuggestion(null)} className="btn-ghost" style={{ flexGrow: 1, fontSize: '11px', padding: '7px' }}>Dismiss</button>
                  </div>
                </div>
              )}
            </section>

            {/* Delete — pinned to bottom */}
            <section style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleDeleteTask}
                className="btn-ghost"
                style={{ color: 'var(--error)', width: '100%', justifyContent: 'flex-start', gap: '10px', opacity: 0.6, fontSize: '12px' }}
              >
                <Trash2 size={14} />
                <span>Delete task</span>
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
