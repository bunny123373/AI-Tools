import { useState } from 'react'
import { Check, Copy, MessageSquare, Trash2 } from 'lucide-react'
import { loadPrompts, savePrompts } from '../api'

interface Props {
  onUse: (prompt: string) => void
}

interface PromptEntry {
  title: string
  prompt: string
  tag: string
}

export default function Prompts({ onUse }: Props) {
  const [items, setItems] = useState<PromptEntry[]>(() => loadPrompts())
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [tag, setTag] = useState('General')
  const [copiedId, setCopiedId] = useState('')

  const update = (next: PromptEntry[]) => {
    setItems(next)
    savePrompts(next)
  }

  const add = () => {
    if (!title.trim() || !prompt.trim()) return
    update([...items, { title: title.trim(), prompt: prompt.trim(), tag: tag.trim() || 'General' }])
    setTitle('')
    setPrompt('')
  }

  const remove = (i: number) => {
    update(items.filter((_, idx) => idx !== i))
  }

  const copy = async (p: PromptEntry, i: number) => {
    try {
      await navigator.clipboard.writeText(p.prompt)
      setCopiedId(String(i))
      setTimeout(() => setCopiedId(''), 1200)
    } catch {
      // ignore
    }
  }

  const tags = [...new Set(['General', ...items.map((i) => i.tag)])]

  return (
    <div className="page prompts-page">
      <div className="section-head">
        <h1>Prompt library</h1>
        <p>Save your favorite prompts and reuse them in the chat in one click.</p>
      </div>

      <div className="prompt-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title, e.g. Email reply"
        />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="The prompt text…"
          rows={3}
        />
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Tag, e.g. Work"
        />
        <button className="primary" onClick={add} disabled={!title.trim() || !prompt.trim()}>
          + Save prompt
        </button>
      </div>

      <div className="tag-list">
        {tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>

      <div className="prompt-list">
        {items.length === 0 && <p className="hint">No prompts yet — add your first one above.</p>}
        {items.map((p, i) => (
          <div key={i} className="prompt-card">
            <div className="prompt-card-head">
              <h3>{p.title}</h3>
              <span className="tag">{p.tag}</span>
            </div>
            <p className="prompt-text">{p.prompt}</p>
            <div className="prompt-actions">
              <button className="ghost" onClick={() => onUse(p.prompt)}>
                <MessageSquare size={15} />
                <span>Use in chat</span>
              </button>
              <button className="ghost" onClick={() => void copy(p, i)}>
                {copiedId === String(i) ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedId === String(i) ? 'Copied' : 'Copy'}</span>
              </button>
              <button className="ghost danger" onClick={() => remove(i)}>
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}