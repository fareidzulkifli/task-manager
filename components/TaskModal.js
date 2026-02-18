'use client';

import { useState, useEffect } from 'react'
import { 
  X, 
  Info, 
  FileText, 
  Paperclip, 
  Sparkles, 
  Trash2, 
  Calendar, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  Download,
  Loader2,
  ChevronRight,
  Hash,
  Activity,
  Zap,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react'

export default function TaskModal({ task, onClose, onTaskUpdated, onTaskPatch, projectContext }) {
  const [editedTask, setEditedTask] = useState(task)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('notes') // Default to notes for deep work
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
    if (!confirm('Are you sure you want to delete this attachment?')) return
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
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '5vh' }} onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
      <div className="modal-content" style={{ 
        maxWidth: '1100px', 
        padding: '0', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        height: '85vh',
        border: '1px solid var(--border-strong)',
        background: 'var(--background)'
      }}>
        {/* Superior Control Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '12px 24px', 
          background: 'var(--surface)', 
          borderBottom: '1px solid var(--border)',
          height: '56px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-disabled)', letterSpacing: '0.05em' }}>
              <Hash size={14} />
              <span>TASK-{task.id.slice(0,8).toUpperCase()}</span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-strong)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)' }}>
              <Activity size={14} />
              <span>{projectContext?.name || 'Project Root'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isSaving && <Loader2 className="animate-spin" size={14} color="var(--accent)" />}
              <span style={{ fontSize: '11px', color: 'var(--text-disabled)', fontWeight: '600', textTransform: 'uppercase' }}>
                {isSaving ? 'Syncing...' : 'Live Sync Active'}
              </span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-strong)' }}></div>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '6px', borderRadius: '4px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          {/* Main Content Area */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Task Title Input */}
            <div>
              <input
                value={editedTask.summary}
                onChange={e => setEditedTask({ ...editedTask, summary: e.target.value })}
                onBlur={() => handleSave()}
                placeholder="Unstructured Task Summary"
                style={{ 
                  fontSize: '28px', 
                  fontWeight: '700', 
                  background: 'transparent', 
                  border: 'none', 
                  padding: '0',
                  boxShadow: 'none',
                  letterSpacing: '-0.04em',
                  color: 'var(--text)'
                }}
              />
            </div>

            {/* View Selection (Industrial Tabs) */}
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border)' }}>
              <button 
                onClick={() => setActiveTab('notes')} 
                className={`modal-tab ${activeTab === 'notes' ? 'active' : ''}`}
                style={{ background: 'transparent', border: 'none', padding: '12px 0', fontSize: '13px', fontWeight: '600' }}
              >
                Documentation
              </button>
              <button 
                onClick={() => setActiveTab('files')} 
                className={`modal-tab ${activeTab === 'files' ? 'active' : ''}`}
                style={{ background: 'transparent', border: 'none', padding: '12px 0', fontSize: '13px', fontWeight: '600' }}
              >
                Artifacts
              </button>
            </div>

            <div style={{ flexGrow: 1 }}>
              {activeTab === 'notes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Extended Context</h3>
                    <button 
                      onClick={() => setPreviewMarkdown(!previewMarkdown)}
                      className="btn-ghost"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      {previewMarkdown ? 'Source View' : 'Rich Preview'}
                    </button>
                  </div>
                  {!previewMarkdown ? (
                    <textarea 
                      value={editedTask.notes_markdown || ''} 
                      onChange={e => setEditedTask({ ...editedTask, notes_markdown: e.target.value })}
                      onBlur={() => handleSave()}
                      placeholder="Input comprehensive task documentation..."
                      style={{ 
                        flexGrow: 1, 
                        background: 'transparent', 
                        border: 'none', 
                        padding: '0', 
                        resize: 'none', 
                        lineHeight: '1.7', 
                        fontSize: '15px',
                        color: 'var(--text-secondary)',
                        fontFamily: 'Inter, sans-serif'
                      }}
                    />
                  ) : (
                    <div style={{ 
                      lineHeight: '1.8', 
                      fontSize: '15px', 
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {editedTask.notes_markdown || 'No documentation provided.'}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'files' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Project Artifacts</h3>
                    <div>
                      <input type="file" onChange={handleFileUpload} disabled={uploadingFile} id="file-upload" style={{ display: 'none' }} />
                      <label htmlFor="file-upload" className="btn-ghost" style={{ cursor: 'pointer', fontSize: '12px' }}>
                        {uploadingFile ? <Loader2 className="animate-spin" size={14} /> : <Paperclip size={14} />}
                        <span>Ingest File</span>
                      </label>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                    {attachments.map(att => (
                      <div key={att.id} style={{ 
                        padding: '16px', 
                        background: 'var(--surface)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ background: 'var(--background)', p: '8px', borderRadius: '4px', display: 'flex', padding: '8px' }}>
                            <FileText size={16} color="var(--accent)" />
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.filename}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-disabled)', fontFamily: 'monospace' }}>{(att.size_bytes / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', paddingTop: '12px', gap: '8px' }}>
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ flexGrow: 1, fontSize: '11px', padding: '6px' }}>
                            <Download size={12} /> Access
                          </a>
                          <button onClick={() => handleDeleteAttachment(att.id)} className="btn-ghost" style={{ color: 'var(--error)', padding: '6px' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {attachments.length === 0 && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-disabled)' }}>
                        No associated artifacts found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Controls & AI */}
          <div style={{ 
            width: '320px', 
            background: 'var(--surface)', 
            borderLeft: '1px solid var(--border)', 
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            overflowY: 'auto'
          }}>
            {/* Status Section */}
            <section>
              <h4 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px' }}>Status Engine</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <select
                  value={editedTask.status}
                  onChange={e => {
                    const status = e.target.value;
                    setEditedTask({ ...editedTask, status });
                    handleSave({ ...editedTask, status });
                  }}
                  style={{ background: 'var(--background)', fontWeight: '600', height: '40px' }}
                >
                  <option value="In Progress">ACTIVE: IN PROGRESS</option>
                  <option value="Done">SYSTEM: COMPLETE</option>
                  <option value="KIV">HOLD: KIV</option>
                </select>
                
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-disabled)' }} />
                  <input
                    type="date"
                    value={editedTask.due_date || ''}
                    onChange={e => {
                      const due_date = e.target.value || null;
                      setEditedTask({ ...editedTask, due_date });
                      handleSave({ ...editedTask, due_date });
                    }}
                    style={{ paddingLeft: '36px', height: '40px', background: 'var(--background)', fontSize: '13px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </section>

            {/* Matrix Section */}
            <section>
              <h4 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px' }}>Eisenhower Matrix</h4>
              <div style={{ background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gridTemplateRows: '1fr 1fr',
                  aspectRatio: '1/1'
                }}>
                  {/* Important & Urgent */}
                  <div 
                    onClick={() => {
                      const next = { urgent: true, important: true };
                      setEditedTask({...editedTask, ...next});
                      handleSave({...editedTask, ...next});
                    }}
                    style={{ 
                      borderRight: '1px solid var(--border)', 
                      borderBottom: '1px solid var(--border)',
                      padding: '12px',
                      cursor: 'pointer',
                      background: editedTask.urgent && editedTask.important ? 'var(--error-muted)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '9px', fontWeight: '800', color: editedTask.urgent && editedTask.important ? 'var(--error)' : 'var(--text-disabled)' }}>DO</div>
                  </div>
                  {/* Important, Not Urgent */}
                  <div 
                    onClick={() => {
                      const next = { urgent: false, important: true };
                      setEditedTask({...editedTask, ...next});
                      handleSave({...editedTask, ...next});
                    }}
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      padding: '12px',
                      cursor: 'pointer',
                      background: !editedTask.urgent && editedTask.important ? 'var(--accent-subtle)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '9px', fontWeight: '800', color: !editedTask.urgent && editedTask.important ? 'var(--accent)' : 'var(--text-disabled)' }}>SCHEDULE</div>
                  </div>
                  {/* Urgent, Not Important */}
                  <div 
                    onClick={() => {
                      const next = { urgent: true, important: false };
                      setEditedTask({...editedTask, ...next});
                      handleSave({...editedTask, ...next});
                    }}
                    style={{ 
                      borderRight: '1px solid var(--border)',
                      padding: '12px',
                      cursor: 'pointer',
                      background: editedTask.urgent && !editedTask.important ? 'var(--warning-muted)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '9px', fontWeight: '800', color: editedTask.urgent && !editedTask.important ? 'var(--warning)' : 'var(--text-disabled)' }}>DELEGATE</div>
                  </div>
                  {/* Neither */}
                  <div 
                    onClick={() => {
                      const next = { urgent: false, important: false };
                      setEditedTask({...editedTask, ...next});
                      handleSave({...editedTask, ...next});
                    }}
                    style={{ 
                      padding: '12px',
                      cursor: 'pointer',
                      background: !editedTask.urgent && !editedTask.important ? 'var(--surface-alt)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-disabled)' }}>ELIMINATE</div>
                  </div>
                </div>
              </div>
              <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-disabled)', lineHeight: '1.4' }}>
                Strategic positioning based on industrial urgency and impact analysis.
              </p>
            </section>

            {/* AI Intelligence Panel */}
            <section style={{ 
              background: 'linear-gradient(135deg, var(--accent-subtle) 0%, transparent 100%)', 
              padding: '20px', 
              borderRadius: '12px',
              border: '1px solid var(--accent-muted)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Zap size={16} color="var(--accent)" />
                <h4 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Core Intelligence</h4>
              </div>
              
              {!aiSuggestion ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={handleAiSummarize} disabled={aiLoading} className="btn-ghost" style={{ justifyContent: 'flex-start', background: 'var(--background)', fontSize: '12px', width: '100%' }}>
                    {aiLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    Optimize Summary
                  </button>
                  <button onClick={handleAiPriority} disabled={aiLoading} className="btn-ghost" style={{ justifyContent: 'flex-start', background: 'var(--background)', fontSize: '12px', width: '100%' }}>
                    {aiLoading ? <Loader2 className="animate-spin" size={14} /> : <Activity size={14} />}
                    Evaluate Matrix
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
                    {aiSuggestion.type === 'summary' ? aiSuggestion.content : aiSuggestion.content.reasoning}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={applyAiSuggestion} className="btn-primary" style={{ flexGrow: 1, fontSize: '11px', padding: '8px' }}>Apply</button>
                    <button onClick={() => setAiSuggestion(null)} className="btn-ghost" style={{ flexGrow: 1, fontSize: '11px', padding: '8px' }}>Abort</button>
                  </div>
                </div>
              )}
            </section>

            <section style={{ marginTop: 'auto' }}>
              <button 
                onClick={handleDeleteTask} 
                className="btn-ghost" 
                style={{ color: 'var(--error)', width: '100%', justifyContent: 'flex-start', gap: '12px', opacity: 0.6 }}
              >
                <Trash2 size={16} />
                <span>Decommission Task</span>
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
