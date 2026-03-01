'use client'

import { useState, useEffect } from 'react'
import { Folder, FolderOpen, FileText, File, Loader2, AlertCircle } from 'lucide-react'

function isHidden(filePath) {
  const segments = filePath.split('/')
  return segments.some(segment => {
    const name = segment.toLowerCase()
    return name.startsWith('.')
      || name.includes('login')
      || name.endsWith('.rdp')
  })
}

function buildTree(files) {
  const root = {}
  for (const file of files) {
    const parts = file.path.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!node[part]) node[part] = { __type: 'folder', __children: {} }
      node = node[part].__children
    }
    const name = parts[parts.length - 1]
    node[name] = { __type: 'file', __path: file.path, __size: file.size }
  }
  return root
}

function getFileIcon(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'md'
  if (ext === 'md') return <FileText size={13} className="gn-icon-md" />
  if (ext === 'pdf') return <File size={13} className="gn-icon-pdf" />
  return <File size={13} className="gn-icon-file" />
}

function TreeNode({ name, node, depth, selectedPath, onSelect, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || depth === 0)

  if (node.__type === 'file') {
    const isSelected = selectedPath === node.__path
    return (
      <div
        className={`gitnote-tree-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${14 + depth * 14}px` }}
        onClick={() => onSelect(node.__path)}
        title={decodeURIComponent(name)}
      >
        {getFileIcon(name)}
        <span className="gitnote-tree-label">{decodeURIComponent(name)}</span>
      </div>
    )
  }

  return (
    <div>
      <div
        className="gitnote-tree-item gitnote-tree-folder"
        style={{ paddingLeft: `${14 + depth * 14}px` }}
        onClick={() => setOpen(o => !o)}
      >
        {open
          ? <FolderOpen size={13} className="gn-icon-folder" />
          : <Folder size={13} className="gn-icon-folder" />
        }
        <span className="gitnote-tree-label">{decodeURIComponent(name)}</span>
      </div>
      {open && (
        <div>
          {Object.entries(node.__children)
            .sort(([, a], [, b]) => {
              if (a.__type === b.__type) return 0
              return a.__type === 'folder' ? -1 : 1
            })
            .map(([childName, childNode]) => (
              <TreeNode
                key={childName}
                name={childName}
                node={childNode}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                defaultOpen={false}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export default function GitNoteExplorer({ selectedPath, onSelect }) {
  const [tree, setTree] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/gitnote/tree')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setTree(buildTree(data.tree.filter(f => !isHidden(f.path))))
      })
      .catch(err => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className="gn-state-msg gn-state-error">
        <AlertCircle size={14} />
        <span>{error}</span>
      </div>
    )
  }

  if (!tree) {
    return (
      <div className="gn-state-msg">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading files…</span>
      </div>
    )
  }

  return (
    <div className="gitnote-tree-root">
      {Object.entries(tree)
        .sort(([, a], [, b]) => {
          if (a.__type === b.__type) return 0
          return a.__type === 'folder' ? -1 : 1
        })
        .map(([name, node]) => (
          <TreeNode
            key={name}
            name={name}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
            defaultOpen={true}
          />
        ))}
    </div>
  )
}
