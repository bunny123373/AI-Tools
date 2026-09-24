import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Download, Globe, ImageIcon, MessageSquarePlus, Mic, MicOff, Paperclip, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import type { Tab } from '../components/TopBar'
import type { ChatMessage, SearchSource, Settings } from '../types'
import { analyzeImage, createChat, generateImageInfo, getChat, loadSettings, saveChat, saveSettings, sendChat } from '../api'
import { speak, startVoiceInput, stopSpeaking, sttSupported, ttsSupported } from '../lib/speech'
import { downscaleToDataUrl } from '../utils/image'
import ModelPicker from '../components/ModelPicker'
import { SUGGESTIONS } from '../registry'

interface Props {
  seed: { prompt: string; n: number } | null
  /** Conversation to open on mount (from the sidebar history). */
  initialId?: string | null
  /** Fired after any create/save so the sidebar can refresh its list. */
  onHistoryChanged?: () => void
  onOpenSettings?: () => void
  /** Jump to another tab from the welcome quick-nav grid. */
  onGoTab?: (tab: Tab) => void
}

const GEN_SIZES: Record<string, [number, number]> = {
  '1:1': [1024, 1024],
  '16:9': [1280, 720],
  '9:16': [720, 1280],
  '3:2': [1152, 768],
  '2:3': [768, 1152],
}

// ChatGPT-style image flow: after the user describes the image we ask for a
// style (chips in the chat), then append the chosen style to the prompt.
const IMAGE_STYLES: { label: string; hint: string }[] = [
  { label: '✨ Photorealistic', hint: 'photorealistic, natural light, high detail' },
  { label: '🎨 Anime', hint: 'anime style, vibrant colors' },
  { label: '🧊 3D render', hint: '3D render, cinematic lighting' },
  { label: '🖌️ Watercolor', hint: 'watercolor painting, soft pastel colors' },
  { label: '👾 Pixel art', hint: 'pixel art, retro 8-bit' },
  { label: '⬜ Minimalist', hint: 'minimalist, clean, simple composition' },
  { label: '🎬 Cinematic', hint: 'cinematic, dramatic lighting, film still' },
  { label: '✏️ Flat vector', hint: 'flat vector illustration, bold colors' },
]

export default function Chat({ seed, initialId, onHistoryChanged, onOpenSettings }: Props) {
  // App settings (provider, model, temperature…) persisted to localStorage.
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sourcesMap, setSourcesMap] = useState<Record<number, SearchSource[]>>({})
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSystem, setShowSystem] = useState(false)
  const [system, setSystem] = useState('You are a helpful, honest assistant.')
  const [web, setWeb] = useState<'off' | 'on'>('on')
  // Image attached to the next message — stays in the chat, never jumps tabs.
  const [attach, setAttach] = useState<{ dataUrl: string; name: string } | null>(null)
  // Composer switched to image-generation mode (like ChatGPT's image toggle).
  const [genMode, setGenMode] = useState(false)
  const [genAspect, setGenAspect] = useState('1:1')
  // Awaiting the user's style choice for an image (ChatGPT-style ask step).
  const [pendingGen, setPendingGen] = useState<{ prompt: string } | null>(null)
  // Stage shown by the dedicated "Generating image…" indicator (distinct from
  // the plain typing dots, so the user knows an image is being rendered).
  const [genStage, setGenStage] = useState<'generating' | 'preparing' | ''>('')
  // Id of the conversation currently being edited (null = brand-new chat).
  const [convId, setConvId] = useState<string | null>(initialId ?? null)
  const [loadingChat, setLoadingChat] = useState(!!initialId)
  // Free in-browser speech: mic input + read-aloud.
  const [listening, setListening] = useState(false)
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null)
  const recognitionStopRef = useRef<(() => void) | null>(null)
  const micBaseRef = useRef('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const attachRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (seed) setInput(seed.prompt)
  }, [seed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  // Load an existing conversation when the sidebar picks one. App remounts Chat
  // with a fresh key per conversation, so this runs once per opened chat.
  useEffect(() => {
    if (!initialId) return
    let alive = true
    getChat(initialId)
      .then(({ chat }) => {
        if (!alive) return
        setMessages(chat.messages)
        setSourcesMap({})
        setConvId(chat.id)
        setLoadingChat(false)
      })
      .catch(() => {
        if (!alive) return
        // Deleted or unreachable — start a fresh conversation.
        setConvId(null)
        setLoadingChat(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId])

  const update = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
  }

  const titleOf = (msgs: ChatMessage[]) => msgs.find((m) => m.role === 'user')?.content ?? 'New chat'

  const persist = async (id: string | null, msgs: ChatMessage[]) => {
    if (!id) return
    try {
      await saveChat(id, { title: titleOf(msgs), messages: msgs })
      onHistoryChanged?.()
    } catch {
      // Persistence is best-effort — never block the conversation.
    }
  }

  const pickImage = async (f: File | undefined) => {
    if (!f) return
    try {
      // Downscale now (also what the vision API needs) — keeps history light.
      const dataUrl = await downscaleToDataUrl(f, 1280, 0.85)
      setGenMode(false)
      setPendingGen(null)
      setAttach({ dataUrl, name: f.name })
    } catch {
      setAttach(null)
    }
  }

  const send = async () => {
    const text = input.trim()
    const hasAttach = !!attach
    if ((!text && !hasAttach) || busy || loadingChat) return
    // Cancel any in-progress voice input before sending.
    recognitionStopRef.current?.()
    recognitionStopRef.current = null
    setListening(false)
    const userMsg: ChatMessage = hasAttach
      ? { role: 'user', content: text || 'Analyze this image.', imageDataUrl: attach!.dataUrl }
      : { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    const attachSnapshot = attach
    setAttach(null)
    setBusy(true)

    let id = convId
    // Ensure the conversation exists server-side before the AI call, so the
    // user message survives even if the reply is interrupted.
    if (!id) {
      try {
        const created = await createChat({
          title: text || (hasAttach ? 'Image chat' : 'New chat'),
          messages: [userMsg],
        })
        id = created.chat.id
        setConvId(id)
        onHistoryChanged?.()
      } catch {
        id = null
      }
    } else {
      await persist(id, next)
    }

    const finish = async (final: ChatMessage[]) => {
      setMessages(final)
      await persist(id, final)
    }

    try {
      if (genMode) {
        // ChatGPT-style: describe → we ask for a style → chips → generate.
        setPendingGen({ prompt: text })
      } else if (hasAttach && attachSnapshot) {
        // ---- Vision analysis (stays in the chat thread) ----
        const res = await analyzeImage({
          provider: settings.provider,
          model: settings.model,
          imageDataUrl: attachSnapshot.dataUrl,
          prompt: text || undefined,
          openrouterKey: settings.openrouterKey || undefined,
          geminiKey: settings.geminiKey || undefined,
          ollamaBaseUrl: settings.ollamaBaseUrl || undefined,
        })
        const usedModel = res.autoSwitched ? `switched to ${res.model} (vision)` : res.model
        await finish([...next, { role: 'assistant', content: res.result, usedModel }])
      } else {
        // ---- Plain chat ----
        const { reply, sources } = await sendChat({
          provider: settings.provider,
          model: settings.model,
          messages: showSystem && system.trim() ? [{ role: 'system', content: system }, ...next] : next,
          web: web === 'on',
          openrouterKey: settings.openrouterKey || undefined,
          geminiKey: settings.geminiKey || undefined,
          xkiroKey: settings.xkiroKey || undefined,
          webSearchKey: settings.webSearchKey || undefined,
          ollamaBaseUrl: settings.ollamaBaseUrl || undefined,
        })
        const final: ChatMessage[] = [...next, { role: 'assistant', content: reply }]
        setMessages(final)
        setSourcesMap((prev) => ({ ...prev, [next.length]: sources ?? [] }))
        await persist(id, final)
      }
    } catch (e) {
      await finish([
        ...next,
        { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Something went wrong.'}` },
      ])
    } finally {
      setBusy(false)
    }
  }

  const startPrompt = (p: string) => {
    setInput(p)
    inputRef.current?.focus()
  }

  // Actually generate the image (called from the style chips). The user message
  // is already in `messages`; we just append the assistant image message once
  // the chosen provider engine returns bytes.
  const genImage = async (prompt: string) => {
    setPendingGen(null)
    setGenStage('generating')
    setBusy(true)
    const isGem = settings.provider === 'gemini'
    const isPut = settings.provider === 'puter'
    const isXk = settings.provider === 'xkiro'
    const engine = (isGem ? 'gemini' : isXk ? 'xkiro' : isPut ? 'puter' : 'pollinations') as
      | 'gemini'
      | 'pollinations'
      | 'puter'
      | 'xkiro'
    const [w, h] = GEN_SIZES[genAspect] || GEN_SIZES['1:1']
    try {
      const { blob, usedModel } = await generateImageInfo({
        prompt,
        width: w,
        height: h,
        seed: Math.floor(Math.random() * 1_000_000_000),
        model: isGem || isPut ? 'gemini-3.1-flash-image' : isXk ? 'sensenova/sensenova-u1.5-lite' : 'flux',
        provider: engine,
        geminiKey: isGem ? settings.geminiKey || undefined : undefined,
        xkiroKey: isXk ? settings.xkiroKey || undefined : undefined,
      })
      // Convert to a compact JPEG data URL so the image survives in history.
      setGenStage('preparing')
      const image = await downscaleToDataUrl(blob, 1024, 0.85)
      const final: ChatMessage[] = [...messages, { role: 'assistant', content: '', image, imageLabel: prompt, usedModel }]
      setMessages(final)
      await persist(convId, final)
    } catch (e) {
      const final: ChatMessage[] = [
        ...messages,
        { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Something went wrong.'}` },
      ]
      setMessages(final)
      await persist(convId, final)
    } finally {
      setBusy(false)
      setGenStage('')
    }
  }

  const resetChat = () => {
    setMessages([])
    setSourcesMap({})
    setInput('')
    setAttach(null)
    setGenMode(false)
    setPendingGen(null)
    setGenStage('')
    setConvId(null)
  }

  const toggleMic = () => {
    if (listening) {
      recognitionStopRef.current?.()
      recognitionStopRef.current = null
      setListening(false)
      return
    }
    if (!sttSupported) return
    micBaseRef.current = input
    const stop = startVoiceInput({
      onResult: (finalText, interim) => {
        const base = micBaseRef.current
        const spoken = `${finalText}${interim}`
        setInput(base ? (spoken ? `${base} ${spoken}` : base) : spoken)
      },
      onEnd: () => {
        recognitionStopRef.current = null
        setListening(false)
      },
      onError: () => {
        recognitionStopRef.current = null
        setListening(false)
      },
    })
    if (stop) {
      recognitionStopRef.current = stop
      setListening(true)
    }
  }

  const toggleSpeak = (idx: number, content: string) => {
    if (speakingIdx === idx) {
      stopSpeaking()
      setSpeakingIdx(null)
      return
    }
    setSpeakingIdx(idx)
    speak(content, {
      onEnd: () => setSpeakingIdx((cur) => (cur === idx ? null : cur)),
    })
  }

  const welcome = !loadingChat && messages.length === 0

  const composer = (
    <div className="composer">
      {!welcome && (
        <div className="composer-model-chip">
          <ModelPicker settings={settings} onChange={update} />
        </div>
      )}

      {attach && (
        <div className="composer-attach">
          <img src={attach.dataUrl} alt="" />
          <span className="composer-attach-name">{attach.name}</span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Remove image"
            title="Remove image"
            onClick={() => setAttach(null)}
          >
            <X size={14} />
          </button>
          <span className="composer-attach-mode">will be analyzed in this chat</span>
        </div>
      )}

      {genMode && (
        <div className="composer-gen">
          <div className="gen-chips" role="group" aria-label="Aspect ratio">
            {Object.keys(GEN_SIZES).map((a) => (
              <button
                key={a}
                type="button"
                className={`gen-chip ${genAspect === a ? 'active' : ''}`}
                onClick={() => setGenAspect(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="hint composer-note">
            Image mode — describe the image and I'll ask for the style first (like ChatGPT), then generate it right here. Powered by your provider's image model (Gemini / Puter / xkiro) or free Pollinations.
          </p>
        </div>
      )}

      <div className="composer-row">
        {!genMode && (
          <>
            <button
              type="button"
              className="composer-icon"
              title="Attach an image — analyze it right here in the chat"
              aria-label="Attach image"
              onClick={() => attachRef.current?.click()}
            >
              <Paperclip size={17} />
            </button>
            <input
              ref={attachRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void pickImage(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </>
        )}

        <button
          type="button"
          className={`composer-icon ${genMode ? 'active' : ''}`}
          title={genMode ? 'Back to text chat' : 'Generate an image — stays in the chat'}
          aria-label={genMode ? 'Turn off image mode' : 'Turn on image mode'}
          onClick={() => {
            setGenMode((v) => !v)
            setAttach(null)
            setPendingGen(null)
          }}
        >
          <ImageIcon size={17} />
        </button>

        {sttSupported && (
          <button
            type="button"
            className={`composer-icon ${listening ? 'listening' : ''}`}
            title={listening ? 'Stop voice input' : 'Speak to type — free, in your browser'}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            onClick={toggleMic}
          >
            {listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
        )}

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder={
            genMode
              ? 'Describe the image to create… (Enter to generate)'
              : attach
                ? 'Ask anything about this image… (Enter to send)'
                : 'Ask anything… (Enter to send, Shift+Enter for a new line)'
          }
          rows={2}
        />

        <div className="cw-search">
          <Globe size={14} />
          <select
            value={web}
            onChange={(e) => setWeb(e.target.value as 'off' | 'on')}
            aria-label="Web search"
            title="Web search"
          >
            <option value="off">Web search: Off</option>
            <option value="on">Web search: On</option>
          </select>
        </div>

        <button
          className="primary composer-send"
          onClick={() => void send()}
          disabled={busy || (!input.trim() && !attach)}
        >
          {genMode ? <Sparkles size={16} /> : <Send size={16} />}
          <span>{genMode ? 'Generate' : 'Send'}</span>
        </button>
      </div>
      {web === 'on' && !genMode && (
        <p className="hint composer-note">
          {settings.webSearchKey ? (
            <>Web search is on — fresh results are included with your message and cited in the reply.</>
          ) : (
            <>
              Web search needs a free Tavily API key — add one in <em>Settings</em>, or switch{' '}
              <em>Web search: Off</em>.
            </>
          )}
        </p>
      )}
    </div>
  )

  return (
    <div className={`page chat-page ${welcome ? 'welcome' : ''}`}>
      {welcome ? (
        <>
          <ModelPicker big settings={settings} onChange={update} onOpenSettings={onOpenSettings} />

          <div className="chat-welcome">
            <div className="cw-icon">
              <Sparkles size={26} />
            </div>
            <h2>How can I help you today?</h2>
            <p>Ask a question, generate images, analyze photos, write code, or use any tool from the sidebar.</p>
            <div className="cw-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s.label} className="cw-suggestion" onClick={() => startPrompt(s.prompt)}>
                  <span className="cs-label">{s.label}</span>
                  <span className="cs-prompt">{s.prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {composer}
        </>
      ) : (
        <>
          <div className="chat-top">
            <div className="chat-actions">
              <button className="ghost" onClick={() => setShowSystem((v) => !v)}>
                <Bot size={16} />
                <span>{showSystem ? 'Hide system prompt' : 'System prompt'}</span>
              </button>
              <button className="ghost" onClick={resetChat}>
                <MessageSquarePlus size={16} />
                <span>New chat</span>
              </button>
            </div>
          </div>

          {showSystem && (
            <textarea
              className="system-input"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="Optional system prompt — sets the assistant's behavior"
              rows={2}
            />
          )}

          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="bubble">
                  {m.role === 'user' && m.imageDataUrl && (
                    <img className="msg-img msg-img-user" src={m.imageDataUrl} alt="Attached image" />
                  )}
                  {m.role === 'assistant' ? (
                    <>
                      {m.image && (
                        <div className="msg-img-wrap">
                          <img className="msg-img" src={m.image} alt={m.imageLabel || 'Generated image'} />
                          {m.imageLabel && <p className="msg-img-label">{m.imageLabel}</p>}
                          <div className="msg-img-actions">
                            <a className="ghost" href={m.image} download={`generated-${i}.jpg`}>
                              <Download size={14} /> Save image
                            </a>
                          </div>
                        </div>
                      )}
                      {m.content && <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>}
                      {m.usedModel && <p className="msg-model-note">via {m.usedModel}</p>}
                    </>
                  ) : (
                    <pre>{m.content}</pre>
                  )}
                </div>
                {m.role === 'assistant' && m.content && ttsSupported && (
                  <button
                    className={`msg-speak ${speakingIdx === i ? 'speaking' : ''}`}
                    title={speakingIdx === i ? 'Stop reading' : 'Read aloud — free, in your browser'}
                    aria-label={speakingIdx === i ? 'Stop reading aloud' : 'Read this message aloud'}
                    onClick={() => toggleSpeak(i, m.content)}
                  >
                    {speakingIdx === i ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                )}
                {m.role === 'assistant' && !m.content && !m.image && (sourcesMap[i]?.length ?? 0) > 0 && (
                  <div className="msg-sources">
                    <span className="msg-sources-label">Sources</span>
                    <ul>
                      {sourcesMap[i].map((s, j) => (
                        <li key={j}>
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {pendingGen ? (
              <div className="msg assistant">
                <div className="bubble">
                  <p className="style-q">
                    <Sparkles size={14} /> How should{' '}
                    <em>
                      “{pendingGen.prompt.slice(0, 80)}
                      {pendingGen.prompt.length > 80 ? '…' : ''}”
                    </em>{' '}
                    look? Pick a style or generate as-is:
                  </p>
                  <div className="style-chips">
                    {IMAGE_STYLES.map((s) => (
                      <button
                        key={s.hint}
                        type="button"
                        className="style-chip"
                        onClick={() => void genImage(`${pendingGen.prompt}, ${s.hint}`)}
                      >
                        {s.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="style-chip plain"
                      onClick={() => void genImage(pendingGen.prompt)}
                    >
                      Generate now
                    </button>
                  </div>
                </div>
              </div>
            ) : genStage ? (
              <div className="msg assistant">
                <div className="bubble img-gen">
                  <ImageIcon size={15} />
                  <span>{genStage === 'generating' ? 'Generating image… (can take ~30s)' : 'Preparing preview…'}</span>
                  <span className="img-gen-bar">
                    <i />
                  </span>
                </div>
              </div>
            ) : (busy || loadingChat) && (
              <div className="msg assistant">
                <div className="bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {composer}
        </>
      )}
    </div>
  )
}