import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react'
import type { FloatingTarget } from './FloatingTools'
import { TOOL_INDEX } from '../registry'

interface Props {
  onPick: (t: FloatingTarget) => void
}

export default function ToolSearch({ onPick }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return TOOL_INDEX.slice(0, 8)
    return TOOL_INDEX.filter(
      (t) => t.label.toLowerCase().includes(term) || (t.hint || '').toLowerCase().includes(term),
    ).slice(0, 10)
  }, [q])

  useEffect(() => setActive(0), [q])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Expose a focus handle so "Web Search" can jump here.
  useEffect(() => {
    const t = window as unknown as { __focusToolSearch?: () => void }
    t.__focusToolSearch = () => {
      inputRef.current?.focus()
      setOpen(true)
    }
    return () => {
      delete t.__focusToolSearch
    }
  }, [])

  const pick = (target: FloatingTarget) => {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
    onPick(target)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[active]) pick(results[active].target)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="tool-search" ref={boxRef}>
      <Search size={16} className="tool-search-icon" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search tools…"
        aria-label="Search tools"
      />
      {q && (
        <button className="tool-search-clear" onClick={() => setQ('')} aria-label="Clear search">
          ✕
        </button>
      )}
      {open && (
        <div className="tool-search-drop">
          <div className="tool-search-head">Jump to a tool</div>
          {results.length === 0 && <div className="tool-search-empty">No tools match “{q}”</div>}
          {results.map((r, i) => (
            <button
              key={r.label}
              className={`tool-search-item ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(r.target)}
            >
              <span className="tsi-label">
                {r.label}
                {r.hint && <small>{r.hint}</small>}
              </span>
              {i === active ? <CornerDownLeft size={13} /> : <ArrowRight size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}