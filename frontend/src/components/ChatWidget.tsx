import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchChatHistory, fetchProduct, sendChatMessage } from '../api.ts'
import type { ChatProduct } from '../api.ts'
import { useAuth } from '../auth.tsx'
import { formatPrice } from '../format.ts'
import { useMatches } from '../matches.tsx'
import { onOpenShopChat } from '../openChat.ts'
import { ProductCard } from './ProductCard.tsx'
import type { ProductDetail } from '../types.ts'

type ChatLine = {
  id: number
  role: 'user' | 'assistant'
  content: string
  products?: ChatProduct[]
}

const greeting: ChatLine = {
  id: 0,
  role: 'assistant',
  content:
    "Ah, a visitor! Tell me what you're after — a hoodie for The Game, a crest for your college? I'll fetch it from the factory floor.",
}

function productIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/products\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

function stockLine(product: ProductDetail): string {
  const out = product.sizes.filter((size) => size.quantity <= 0).map((size) => size.size)
  const available = product.sizes.filter((size) => size.quantity > 0).map((size) => size.size)
  if (out.length === 0) return `In stock: ${available.join(', ')}.`
  if (available.length === 0) return 'Out of stock in every size.'
  return `Out of stock: ${out.join(', ')}. Still in stock: ${available[0]}.`
}

export function ChatWidget() {
  const { shopper, ready } = useAuth()
  const { pathname } = useLocation()
  const productId = productIdFromPath(pathname)
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<ChatLine[]>([greeting])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [openPiece, setOpenPiece] = useState<ProductDetail | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const edited = useRef(false)
  const { setMatches } = useMatches()

  useEffect(() => onOpenShopChat(() => setOpen(true)), [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!productId) {
      setOpenPiece(null)
      return
    }
    const controller = new AbortController()
    fetchProduct(productId, controller.signal)
      .then((product) => setOpenPiece(product))
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === 'AbortError') return
        setOpenPiece(null)
      })
    return () => controller.abort()
  }, [productId])

  useEffect(() => {
    if (!ready) return
    edited.current = false
    if (!shopper) {
      setLines([greeting])
      setLoadingHistory(false)
      return
    }
    const controller = new AbortController()
    setLoadingHistory(true)
    fetchChatHistory()
      .then((rows) => {
        if (edited.current || controller.signal.aborted) return
        const stored: ChatLine[] = rows.map((row) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          products: row.products,
        }))
        setLines(stored.length > 0 ? [greeting, ...stored] : [greeting])
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === 'AbortError') return
        if (!edited.current) setLines([greeting])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingHistory(false)
      })
    return () => controller.abort()
  }, [ready, shopper])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [lines, busy, open, loadingHistory])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    edited.current = true
    const history = lines.map((line) => ({ role: line.role, content: line.content }))
    const userLine: ChatLine = { id: Date.now(), role: 'user', content: text }
    setLines((current) => [...current, userLine])
    setDraft('')
    setBusy(true)
    try {
      const reply = await sendChatMessage(text, history, {
        path: pathname,
        product_id: productId,
      })
      setMatches(text, reply.products)
      setLines((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: reply.reply,
          products: reply.products,
        },
      ])
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : 'The shop assistant is not available right now.'
      setLines((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', content: message },
      ])
    } finally {
      setBusy(false)
    }
  }

  const headerNote = openPiece
    ? `About ${openPiece.name}`
    : productId
      ? 'About this piece'
      : shopper
        ? `Ticket Holder: ${shopper.first_name}`
        : 'The factory floor'

  if (!open) {
    return (
      <button
        type="button"
        className="chat-toggle"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls="shop-chat"
      >
        <span className="top-hat" aria-hidden="true" />
        Ask the Chocolatier
      </button>
    )
  }

  return (
    <section className="chat-panel" id="shop-chat" aria-label="The Chocolatier">
      <header className="chat-head">
        <div>
          <strong>The Chocolatier</strong>
          <p>{headerNote}</p>
        </div>
        <button type="button" className="chat-close" onClick={() => setOpen(false)}>
          Close
        </button>
      </header>
      {productId ? (
        <div className="chat-facts">
          <p className="chat-page">Asking about {openPiece?.name ?? 'this piece'}</p>
          {openPiece ? (
            <p className="chat-catalogue">
              From the catalogue: {formatPrice(openPiece.price)}. Colors:{' '}
              {openPiece.colors.length > 0 ? openPiece.colors.join(', ') : 'none listed'}. {stockLine(openPiece)}
            </p>
          ) : (
            <p className="chat-catalogue">Loading this piece from the catalogue…</p>
          )}
        </div>
      ) : null}
      <div className="chat-log" role="log" aria-live="polite" ref={logRef}>
        {shopper && lines.length > 1 ? <p className="past-treats">Your Past Treats</p> : null}
        {loadingHistory ? <p className="bubble assistant">Loading your earlier messages…</p> : null}
        {lines.map((line) => (
          <div key={line.id} className={`chat-turn ${line.role}`}>
            <p className={`bubble ${line.role}`}>{line.content}</p>
            {line.products && line.products.length > 0 ? (
              <div className="chat-cards conveyor">
                {line.products.map((product) => (
                  <ProductCard key={product.product_id} product={product} />
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {busy ? (
          <p className="bubble assistant stirring">
            <span className="bubbles" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Stirring the vats…
          </p>
        ) : null}
      </div>
      <form className="chat-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="chat-draft">
          Message
        </label>
        <input
          id="chat-draft"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={openPiece ? `Ask about ${openPiece.name}` : 'Ask the chocolatier anything…'}
          autoComplete="off"
          disabled={busy}
        />
        <button type="submit" className="primary" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
    </section>
  )
}
