'use client';

import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'

export default function ProjectModal({ project, onClose, onProjectUpdate }) {
  const [edited, setEdited] = useState(project)
  const [isSaving, setIsSaving] = useState(false)
  const [previewMarkdown, setPreviewMarkdown] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    setEdited(project)
  }, [project])

  useEffect(() => {
    if (nameRef.current) {
      nameRef.current.style.height = 'auto'
      nameRef.current.style.height = `${nameRef.current.scrollHeight}px`
    }
  }, [edited.name])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const save = async (data = edited) => {
    try {
      setIsSaving(true)
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          goal: data.goal,
          description_markdown: data.description_markdown
        })
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      alert('Error saving project: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      style={{ alignItems: isMobile ? 'center' : 'flex-start', paddingTop: isMobile ? '0' : '4vh' }}
      onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: isMobile ? '100vh' : 'auto',
          maxHeight: isMobile ? '100vh' : '85vh',
          borderRadius: isMobile ? '0' : 'var(--radius-xl)',
          background: 'var(--background)',
          boxShadow: 'var(--shadow-xl)',
          borderLeft: '1px solid var(--border-strong)',
          borderRight: '1px solid var(--border-strong)',
          borderBottom: '1px solid var(--border-strong)',
          borderTop: '2px solid var(--accent)',
        }}
      >
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
              PROJECT DETAILS
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
        <div style={{
          overflowY: 'auto',
          padding: isMobile ? '20px' : '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          flexGrow: 1
        }}>
          {/* Name */}
          <textarea
            ref={nameRef}
            value={edited.name}
            onChange={e => {
              setEdited({ ...edited, name: e.target.value })
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            onBlur={() => save()}
            rows={1}
            style={{
              fontSize: isMobile ? '20px' : '26px',
              fontWeight: '700',
              background: 'transparent',
              border: 'none',
              padding: '0',
              boxShadow: 'none',
              letterSpacing: '-0.03em',
              color: 'var(--text)',
              width: '100%',
              flexShrink: 0,
              resize: 'none',
              overflow: 'hidden',
              lineHeight: '1.3',
            }}
          />

          {/* Goal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              color: 'var(--text-disabled)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em'
            }}>
              Goal
            </span>
            <input
              type="text"
              value={edited.goal || ''}
              onChange={e => setEdited({ ...edited, goal: e.target.value })}
              onBlur={() => save()}
              placeholder="Why did you create this project?"
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                borderRadius: '0',
                padding: '8px 0',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                boxShadow: 'none',
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                color: 'var(--text-disabled)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em'
              }}>
                Notes
              </span>
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
                value={edited.description_markdown || ''}
                onChange={e => setEdited({ ...edited, description_markdown: e.target.value })}
                onBlur={() => save()}
                placeholder="Add notes about this project..."
                style={{
                  minHeight: isMobile ? 'calc(100vh - 380px)' : '240px',
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
                minHeight: '240px',
              }}>
                {edited.description_markdown || 'Nothing written yet.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
