import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts } from '../api.ts'
import { ProductCard } from '../components/ProductCard.tsx'
import { ensureTicket } from '../ticket.ts'
import type { ProductSummary } from '../types.ts'

const featuredIds = [
  'basic-hoodie-big-yale',
  '2025-yale-vs-harvard-t-shirt',
  'boola-boola-t-shirt',
  'yale-dad-crewneck',
]

export function HomePage() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts(controller.signal)
      .then((rows) => {
        const picked = featuredIds
          .map((id) => rows.find((row) => row.product_id === id))
          .filter((row): row is ProductSummary => row !== undefined)
        const shown = picked.length > 0 ? picked : rows.slice(0, 4)
        ensureTicket(shown.map((row) => row.product_id))
        setProducts(shown)
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === 'AbortError') return
        setError('The catalogue is not loading. Start the backend and refresh.')
      })
    return () => controller.abort()
  }, [])

  return (
    <>
      <section className="hero">
        <div className="skyline" aria-hidden="true">
          <svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax meet">
            <g className="steam">
              <ellipse cx="168" cy="118" rx="22" ry="12" />
              <ellipse cx="198" cy="92" rx="16" ry="9" />
              <ellipse cx="868" cy="108" rx="24" ry="12" />
              <ellipse cx="908" cy="80" rx="14" ry="8" />
            </g>
            <rect className="stack" x="148" y="150" width="40" height="130" rx="3" />
            <rect className="stack" x="842" y="128" width="46" height="152" rx="3" />
            <path className="arch" d="M20 300 Q170 150 330 300" />
            <path className="arch" d="M280 300 Q520 120 760 300" />
            <path className="arch" d="M700 300 Q930 160 1160 300" />
            <g className="windows" fill="#D4A934">
              <rect x="158" y="190" width="8" height="12" />
              <rect x="172" y="190" width="8" height="12" />
              <rect x="400" y="210" width="14" height="18" />
              <rect x="430" y="210" width="14" height="18" />
              <rect x="490" y="188" width="14" height="18" />
              <rect x="520" y="188" width="14" height="18" />
              <rect x="560" y="214" width="14" height="18" />
              <rect x="590" y="214" width="14" height="18" />
              <rect x="852" y="176" width="10" height="14" />
              <rect x="868" y="176" width="10" height="14" />
              <rect x="980" y="230" width="14" height="18" />
              <rect x="1010" y="230" width="14" height="18" />
            </g>
          </svg>
        </div>
        <div className="hero-inner">
          <p className="eyebrow">Yale Bulldog Blue · Now entering the factory</p>
          <h1>Step inside the factory. Every piece is counted.</h1>
          <p className="hero-lead">
            Hoodies, crewnecks and tees from the Campus Customs factory on Broadway.
            Every price comes straight from the catalogue, and every size tells you
            exactly how many are left on the shelf.
          </p>
          <div className="hero-actions">
            <Link className="primary" to="/products">
              Enter the Inventing Room
            </Link>
            <Link className="ghost" to="/about">
              Meet the Makers
            </Link>
          </div>
        </div>
        <svg className="river" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40 C 150 90 250 0 400 40 C 560 84 700 8 860 42 C 1000 72 1100 20 1200 48 L1200 90 L0 90 Z" />
        </svg>
      </section>

      <section className="page">
        <div className="story-grid">
          <article className="wrapper">
            <span className="candy-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="10" />
                <path d="M24 14 V6 M18 8 h12" />
              </svg>
            </span>
            <h2>The Everyday Batch</h2>
            <p>
              The sweatshirt you live in between class and the library. Big Yale
              mark, kangaroo pocket, price on the wrapper.
            </p>
          </article>
          <article className="wrapper">
            <span className="candy-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <path d="M16 30c0-8 16-8 16 0v6H16z" />
                <circle cx="24" cy="16" r="6" />
              </svg>
            </span>
            <h2>Game Day Fizz</h2>
            <p>
              Rivalry graphics and team marks, from The Game to the crews rowing
              before campus wakes up.
            </p>
          </article>
          <article className="wrapper">
            <span className="candy-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <path d="M24 6 28 18h12L30 26l4 14-10-8-10 8 4-14L8 18h12z" />
              </svg>
            </span>
            <h2>Your College Flavor</h2>
            <p>
              Residential college crests and grad-school gear. Pick the flavor
              that matches your courtyard or your lab.
            </p>
          </article>
        </div>
      </section>

      <section className="page band">
        <div className="section-head">
          <h2>Fresh off the conveyor belt</h2>
          <Link to="/products">Tour the whole factory →</Link>
        </div>
        {error ? <p className="banner">{error}</p> : null}
        <div className="grid conveyor">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      </section>

      <section className="visit">
        <div className="page visit-inner">
          <div>
            <p className="eyebrow">The Broadway factory</p>
            <h2>Stop by, or ask the chocolatier</h2>
            <p>
              Campus Customs is at 57 Broadway, New Haven. Ask the chat what
              kind of piece you want, and the matching wrappers show up on this
              page with the photo, the name, the catalogue price, and a short description.
            </p>
          </div>
          <address>
            57 Broadway
            <br />
            New Haven, CT 06511
          </address>
        </div>
      </section>
    </>
  )
}
