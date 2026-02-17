'use client';

import { useState, useEffect } from 'react'

export default function TaskModal({ task, onClose, onTaskUpdated, onTaskPatch, projectContext }) {
  const [editedTask, setEditedTask] = useState(task)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('details') // 'details', 'notes', 'files', 'ai'
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
      onTaskPatch?.(task.id, result)   // update board in-place — no refetch, no flash
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
      
      // 1. Get presigned URL
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      })
      const { signedUrl, key } = await presignRes.json()
      
      // 2. Upload to R2
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      if (!uploadRes.ok) throw new Error('Upload to R2 failed')
      
      // 3. Save attachment metadata to DB
      const attachRes = await fetch(`/api/tasks/${task.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          r2_key: key,
          mime_type: file.type,
          size_bytes: file.size
        })
      })
      const newAttachment = await attachRes.json()
      setAttachments([...attachments, newAttachment])
      
      alert('File uploaded successfully!')
    } catch (err) {
      alert('Upload error: ' + err.message)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteAttachment = async (id) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return
    
    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments?attachment_id=${id}`, {
        method: 'DELETE'
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      setAttachments(attachments.filter(a => a.id !== id))
    } catch (err) {
      alert('Error deleting attachment: ' + err.message)
    }
  }

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
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

  return (
    <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
      <div className="modal-content">
        <header style={{ marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '-0.02em' }}>Edit Task</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '18px', lineHeight: 1 }}>&times;</button>
        </header>

        <div className="modal-tabs">
          <button onClick={() => setActiveTab('details')} className={`modal-tab ${activeTab === 'details' ? 'active' : ''}`}>Details</button>
          <button onClick={() => setActiveTab('notes')} className={`modal-tab ${activeTab === 'notes' ? 'active' : ''}`}>Notes</button>
          <button onClick={() => setActiveTab('files')} className={`modal-tab ${activeTab === 'files' ? 'active' : ''}`}>Files {attachments.length > 0 && `(${attachments.length})`}</button>
          <button onClick={() => setActiveTab('ai')} className={`modal-tab ${activeTab === 'ai' ? 'active' : ''}`}>AI Assistant</button>
        </div>

        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label className="form-label">Summary</label>
              <input
                value={editedTask.summary}
                onChange={e => setEditedTask({ ...editedTask, summary: e.target.value })}
                onBlur={() => handleSave()}
              />
            </div>

            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ flexGrow: 1 }}>
                <label className="form-label">Status</label>
                <select
                  value={editedTask.status}
                  onChange={e => {
                    const status = e.target.value;
                    setEditedTask({ ...editedTask, status });
                    handleSave({ ...editedTask, status });
                  }}
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                  <option value="KIV">KIV</option>
                </select>
              </div>
              <div style={{ flexGrow: 1 }}>
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  value={editedTask.due_date || ''}
                  onChange={e => {
                    const due_date = e.target.value || null;
                    setEditedTask({ ...editedTask, due_date });
                    handleSave({ ...editedTask, due_date });
                  }}
                />
              </div>
            </div>

            <div className="priority-matrix">
              <label className="priority-checkbox-label">
                <input
                  type="checkbox"
                  checked={editedTask.urgent}
                  onChange={e => {
                    const urgent = e.target.checked;
                    setEditedTask({ ...editedTask, urgent });
                    handleSave({ ...editedTask, urgent });
                  }}
                  style={{ width: '15px', height: '15px' }}
                />
                Urgent
              </label>
              <label className="priority-checkbox-label">
                <input
                  type="checkbox"
                  checked={editedTask.important}
                  onChange={e => {
                    const important = e.target.checked;
                    setEditedTask({ ...editedTask, important });
                    handleSave({ ...editedTask, important });
                  }}
                  style={{ width: '15px', height: '15px' }}
                />
                Important
              </label>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPreviewMarkdown(!previewMarkdown)}
                className="btn-ghost"
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                {previewMarkdown ? 'Edit Mode' : 'Preview Mode'}
              </button>
            </div>
            
            {!previewMarkdown ? (
              <textarea 
                rows="15" 
                value={editedTask.notes_markdown || ''} 
                onChange={e => setEditedTask({ ...editedTask, notes_markdown: e.target.value })}
                onBlur={() => handleSave()}
                placeholder="Markdown notes..."
                style={{ resize: 'vertical', minHeight: '300px' }}
              />
            ) : (
              <div style={{ minHeight: '300px', border: '1px solid var(--border)', borderRadius: '4px', padding: '12px', background: 'var(--background)' }}>
                {/* Simplified markdown preview */}
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{editedTask.notes_markdown || 'No notes.'}</pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <input 
                type="file" 
                onChange={handleFileUpload} 
                disabled={uploadingFile}
                id="file-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 16px', background: 'var(--accent)', borderRadius: 'var(--radius-md)', cursor: 'pointer', opacity: uploadingFile ? 0.4 : 1, fontSize: '13px', fontWeight: '500', color: '#fff', transition: 'background 0.15s' }}>
                {uploadingFile ? 'Uploading...' : 'Upload File'}
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {attachments.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No attachments yet.</p>}
              {attachments.map(att => (
                <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'var(--surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{(att.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '500' }}>Download</a>
                    <button onClick={() => handleDeleteAttachment(att.id)} className="btn-danger" style={{ padding: '2px 10px', fontSize: '11px' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button onClick={handleAiSummarize} disabled={aiLoading || !editedTask.notes_markdown} style={{ flexGrow: 1 }}>
                {aiLoading ? 'Thinking...' : 'Summarize Notes'}
              </button>
              <button onClick={handleAiPriority} disabled={aiLoading} style={{ flexGrow: 1 }}>
                {aiLoading ? 'Thinking...' : 'Suggest Priority'}
              </button>
            </div>

            {aiSuggestion && (
              <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--accent-muted)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
                <h4 style={{ marginBottom: '12px', color: 'var(--accent)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Suggestion</h4>

                {aiSuggestion.type === 'summary' ? (
                  <p style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '1.65', color: 'var(--text-secondary)' }}>{aiSuggestion.content}</p>
                ) : (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ marginBottom: '10px', fontWeight: '500' }}>
                      {aiSuggestion.content.urgent ? 'Urgent' : 'Not Urgent'} &amp; {aiSuggestion.content.important ? 'Important' : 'Not Important'}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      {aiSuggestion.content.reasoning}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={applyAiSuggestion} style={{ flexGrow: 1 }}>Approve & Apply</button>
                  <button onClick={() => setAiSuggestion(null)} className="btn-ghost" style={{ flexGrow: 1 }}>Dismiss</button>
                </div>
              </div>
            )}

            {!aiSuggestion && !aiLoading && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px', lineHeight: '1.6' }}>
                Use AI to generate a summary from your notes or suggest priority based on the Eisenhower matrix.
              </p>
            )}
          </div>
        )}

        <footer style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleDeleteTask} className="btn-danger" style={{ fontSize: '12px', padding: '6px 14px' }}>
            Delete Task
          </button>
          <button onClick={onClose} className="btn-ghost">
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
