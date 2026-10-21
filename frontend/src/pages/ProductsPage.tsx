import { useEffect, useMemo, useState } from 'react'
import { fetchProducts } from '../api.ts'
import { ProductCard } from '../components/ProductCard.tsx'
import { ensureTicket } from '../ticket.ts'
import type { ProductSummary } from '../types.ts'

function matches(product: ProductSummary, query: string): boolean {
  const haystack = [
    product.name,
    product.garment_type,
    product.description,
    ...product.search_tags,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

const rooms: Record<string, string> = {
  Hoodies: 'Hoodie Hall',
  Crewnecks: 'The Crewneck Kitchen',
  'T-shirts': 'The Tee Taffy Pull',
  'Quarter-zips': 'The Zipper Works',
  Jackets: 'The Coat Confectionery',
  Other: 'The Curiosity Cabinet',
}

function garmentGroup(garment: string): string {
  const text = garment.toLowerCase()
  if (text.includes('hood')) return 'Hoodies'
  if (text.includes('crew')) return 'Crewnecks'
  if (text.includes('t-shirt')) return 'T-shirts'
  if (text.includes('quarter-zip') || text.includes('mockneck')) return 'Quarter-zips'
  if (text.includes('jacket')) return 'Jackets'
  return 'Other'
}

export function ProductsPage() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts(controller.signal)
      .then((rows) => {
        ensureTicket(rows.map((row) => row.product_id))
        setProducts(rows)
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === 'AbortError') return
        setError('The catalogue is not loading. Start the backend and refresh.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const groups = useMemo(() => {
    const present = new Set(products.map((product) => garmentGroup(product.garment_type)))
    return ['All', ...Object.keys(rooms).filter((name) => present.has(name))]
  }, [products])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return products.filter((product) => {
      if (group !== 'All' && garmentGroup(product.garment_type) !== group) return false
      if (needle && !matches(product, needle)) return false
      return true
    })
  }, [products, query, group])

  return (
    <section className="page">
      <div className="section-head">
        <div>
          <h1>The Inventing Room</h1>
          <p className="lede">
            Every confection in the Campus Customs factory. Pick a room, or
            search for a college or team. Open any wrapper to see the price and
            how many are left in each size.
          </p>
        </div>
      </div>
      <div className="filters" role="group" aria-label="Kind of clothing">
        {groups.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={group === name}
            onClick={() => setGroup(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {group !== 'All' ? <h2 className="room">{rooms[group]}</h2> : null}
      <label className="search">
        <span className="sr-only">Search products</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a flavor: hoodies, colleges, The Game…"
          type="search"
        />
      </label>
      {error ? <p className="banner">{error}</p> : null}
      {loading ? <p className="muted">The conveyor is warming up…</p> : null}
      {!loading && !error ? (
        <p className="muted">{visible.length} treats on the shelf</p>
      ) : null}
      {!loading && !error && visible.length === 0 ? (
        <p>Nothing in the catalogue matches that search.</p>
      ) : null}
      <div className="grid conveyor">
        {visible.map((product) => (
          <ProductCard key={product.product_id} product={product} />
        ))}
      </div>
    </section>
  )
}
