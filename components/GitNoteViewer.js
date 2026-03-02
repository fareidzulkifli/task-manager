'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/atom-one-dark.css'
import { FileText, Loader2, AlertCircle, Download, ChevronRight, Share2, Check, PanelRight } from 'lucide-react'

const TEXT_EXTENSIONS  = new Set(['md', 'txt', 'js', 'ts', 'jsx', 'tsx', 'py', 'json', 'yaml', 'yml', 'toml', 'sh', 'css', 'html', 'xml', 'csv', 'sql'])
const DOCX_EXTENSIONS  = new Set(['doc', 'docx'])
const EXCEL_EXTENSIONS = new Set(['xls', 'xlsx', 'xlxs'])

function Breadcrumb({ path }) {
  const parts = path.split('/')
  return (
    <div className="gn-breadcrumb">
      {parts.map((part, i) => (
        <span key={i} className="gn-breadcrumb-item">
          {i > 0 && <ChevronRight size={11} className="gn-breadcrumb-sep" />}
          <span className={i === parts.length - 1 ? 'gn-breadcrumb-current' : 'gn-breadcrumb-seg'}>
            {decodeURIComponent(part)}
          </span>
        </span>
      ))}
    </div>
  )
}

function stripFrontMatter(text) {
  const match = text.match(/^---\r?\n[\s\S]*?\n---\r?\n?/)
    || text.match(/^\+\+\+\r?\n[\s\S]*?\n\+\+\+\r?\n?/)
  return match ? text.slice(match[0].length) : text
}

export default function GitNoteViewer({ filePath, onToggleExplorer, explorerVisible }) {
  const [content, setContent]       = useState(null)
  const [rendered, setRendered]     = useState(null) // { type: 'docx'|'excel', html?, sheets? }
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [copied, setCopied]         = useState(false)

  const handleShare = () => {
    const url = window.location.origin + '/share/' + filePath
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const filename = filePath?.split('/').pop() || ''
  const ext      = filename.includes('.') ? filename.split('.').pop().toLowerCase() : 'md'
  const isPdf    = ext === 'pdf'
  const isText   = TEXT_EXTENSIONS.has(ext)
  const isDocx   = DOCX_EXTENSIONS.has(ext)
  const isExcel  = EXCEL_EXTENSIONS.has(ext)
  const rawUrl   = filePath ? `/api/gitnote/raw?path=${encodeURIComponent(filePath)}` : null

  useEffect(() => {
    if (!filePath || isPdf) {
      setContent(null)
      setRendered(null)
      setError(null)
      return
    }

    setLoading(true)
    setContent(null)
    setRendered(null)
    setError(null)
    setActiveSheet(0)

    if (isText) {
      fetch(rawUrl)
        .then(r => {
          if (!r.ok) throw new Error(`Failed to load file (${r.status})`)
          return r.text()
        })
        .then(text => setContent(text))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
      return
    }

    if (isDocx || isExcel) {
      fetch(rawUrl)
        .then(r => {
          if (!r.ok) throw new Error(`Failed to load file (${r.status})`)
          return r.arrayBuffer()
        })
        .then(async buffer => {
          if (isDocx) {
            const mod = await import('mammoth')
            const mammoth = mod.default || mod
            const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
            setRendered({ type: 'docx', html: result.value })
          } else {
            const mod = await import('xlsx')
            const XLSX = mod.default || mod
            const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
            const sheets = wb.SheetNames.map(name => ({
              name,
              html: XLSX.utils.sheet_to_html(wb.Sheets[name]),
            }))
            setRendered({ type: 'excel', sheets })
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
      return
    }

    // Unknown binary — nothing to render
    setLoading(false)
  }, [filePath])

  if (!filePath) {
    return (
      <div className="gitnote-viewer-empty">
        <div className="gn-header-actions" style={{ position: 'absolute', top: '12px', right: '32px' }}>
          {onToggleExplorer && (
            <button onClick={onToggleExplorer} className="gn-share-btn gn-desktop-only" title="Toggle Files" style={{ marginLeft: 'auto' }}>
              <PanelRight size={12} />
              <span>{explorerVisible ? 'Hide Files' : 'Show Files'}</span>
            </button>
          )}
        </div>
        <FileText size={36} className="gn-empty-icon" />
        <p className="gn-empty-text">Select a file to view it</p>
      </div>
    )
  }

  return (
    <div className="gitnote-viewer">
      <div className="gitnote-viewer-header">
        <Breadcrumb path={filePath} />
        <div className="gn-header-actions">
          <button onClick={handleShare} className={`gn-share-btn ${copied ? 'copied' : ''}`} title="Copy shareable link">
            {copied ? <Check size={12} /> : <Share2 size={12} />}
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>
          <a href={rawUrl} download={decodeURIComponent(filename)} className="gn-download-btn" title="Download file">
            <Download size={12} />
            <span>Download</span>
          </a>
          {onToggleExplorer && (
            <button onClick={onToggleExplorer} className="gn-share-btn gn-desktop-only" title="Toggle Files">
              <PanelRight size={12} />
              <span>{explorerVisible ? 'Hide Files' : 'Show Files'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="gitnote-viewer-content">

        {/* PDF */}
        {isPdf && (
          <iframe src={rawUrl} className="gitnote-pdf-frame" title={filePath} />
        )}

        {/* Loading / error (shared) */}
        {!isPdf && loading && (
          <div className="gn-state-msg">
            <Loader2 size={15} className="animate-spin" />
            <span>Loading…</span>
          </div>
        )}
        {!isPdf && !loading && error && (
          <div className="gn-state-msg gn-state-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Markdown */}
        {!isPdf && !loading && !error && content !== null && ext === 'md' && (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
            >
              {stripFrontMatter(content)}
            </ReactMarkdown>
          </div>
        )}

        {/* Plain text / code */}
        {!isPdf && !loading && !error && content !== null && ext !== 'md' && isText && (
          <pre className="gitnote-raw-text">{content}</pre>
        )}

        {/* DOCX */}
        {!isPdf && !loading && !error && rendered?.type === 'docx' && (
          <div className="gn-docx-body" dangerouslySetInnerHTML={{ __html: rendered.html }} />
        )}

        {/* Excel */}
        {!isPdf && !loading && !error && rendered?.type === 'excel' && (
          <div className="gn-excel-wrapper">
            {rendered.sheets.length > 1 && (
              <div className="gn-excel-tabs">
                {rendered.sheets.map((s, i) => (
                  <button
                    key={s.name}
                    className={`gn-excel-tab ${activeSheet === i ? 'active' : ''}`}
                    onClick={() => setActiveSheet(i)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            <div
              className="gn-excel-table"
              dangerouslySetInnerHTML={{ __html: rendered.sheets[activeSheet]?.html }}
            />
          </div>
        )}

        {/* Unknown binary */}
        {!isPdf && !loading && !error && !isText && !isDocx && !isExcel && (
          <div className="gn-state-msg" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', paddingTop: '40px' }}>
            <span>Binary file — cannot display inline.</span>
            <a href={rawUrl} download className="gn-download-btn gn-download-prominent">
              <Download size={13} />
              Download file
            </a>
          </div>
        )}

      </div>
    </div>
  )
}
