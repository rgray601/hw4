import { useEffect, useRef } from 'react'
import { useMatches } from '../matches.tsx'
import { ProductCard } from './ProductCard.tsx'

export function ChatMatches() {
  const { products, question } = useMatches()
  const bandRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (products.length === 0) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bandRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [products, question])

  if (products.length === 0) return null

  const countLabel = products.length === 1 ? '1 piece' : `${products.length} pieces`

  return (
    <section className="chat-matches" ref={bandRef} aria-live="polite">
      <div className="page">
        <div className="section-head">
          <div>
            <p className="eyebrow">Off the conveyor</p>
            <h2>{question}</h2>
          </div>
          <p className="muted">{countLabel}</p>
        </div>
        <div className="grid conveyor">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
