import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct } from '../api.ts'
import { useBasket } from '../basket.tsx'
import { openShopChat } from '../openChat.ts'
import { formatPrice, stockLabel } from '../format.ts'
import { ensureTicket } from '../ticket.ts'
import type { ProductDetail } from '../types.ts'

export function ProductPage() {
  const { productId } = useParams()
  const { add } = useBasket()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return
    const controller = new AbortController()
    setProduct(null)
    setError(null)
    fetchProduct(productId, controller.signal)
      .then((row) => {
        ensureTicket([row.product_id])
        setProduct(row)
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === 'AbortError') return
        setError('That piece is not in the catalogue.')
      })
    return () => controller.abort()
  }, [productId])

  if (error) {
    return (
      <section className="page">
        <p className="banner">{error}</p>
        <Link to="/products">Back to products</Link>
      </section>
    )
  }

  if (!product) {
    return (
      <section className="page">
        <p className="muted">Loading this piece…</p>
      </section>
    )
  }

  const total = product.sizes.reduce((sum, size) => sum + size.quantity, 0)

  return (
    <section className="page">
      <p className="back">
        <Link to="/products">Back to the Inventing Room</Link>
      </p>
      <article className="product-detail">
        <div className="photo-frame">
          <img src={product.image_url} alt={product.name} />
        </div>
        <div>
          <p className="garment">{product.garment_type}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <div className="detail-actions">
            <button type="button" className="ask-piece" onClick={openShopChat}>
              Ask the Chocolatier
            </button>
            <button
              type="button"
              className="toss"
              onClick={() =>
                add({
                  product_id: product.product_id,
                  name: product.name,
                  price: product.price,
                  image_url: product.image_url,
                })
              }
            >
              Toss it in the basket
            </button>
          </div>
          <p className="catalogue-note">
            The chat reads this piece from the catalogue: {formatPrice(product.price)}
            {product.colors.length > 0 ? `, ${product.colors.join(', ')}` : ''}.{' '}
            {product.sizes.some((size) => size.quantity <= 0)
              ? `Out of stock in ${product.sizes
                  .filter((size) => size.quantity <= 0)
                  .map((size) => size.size)
                  .join(', ')}. Still in stock: ${
                  product.sizes.find((size) => size.quantity > 0)?.size ?? 'none'
                }.`
              : 'Every listed size is in stock.'}
          </p>
          <p className="detail-copy">{product.description}</p>
          {product.colors.length > 0 ? (
            <>
              <h2>Colors</h2>
              <ul className="chips">
                {product.colors.map((color) => (
                  <li key={color}>{color}</li>
                ))}
              </ul>
            </>
          ) : null}
          <h2>Sizes and stock</h2>
          {total === 0 ? (
            <p className="banner">Out of stock in every size.</p>
          ) : null}
          <ul className="size-list">
            {product.sizes.map((size) => {
              const tone = size.quantity <= 0 ? 'empty' : size.quantity <= 5 ? 'low' : 'full'
              return (
                <li key={size.size} className={tone}>
                  <span className="jar" aria-hidden="true">
                    <span style={{ height: `${fillPercent(size.quantity)}%` }} />
                  </span>
                  <span className="size-name">{size.size}</span>
                  <span className="qty">{stockLabel(size.quantity)}</span>
                  <span className="vat">{vatLabel(size.quantity)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </article>
    </section>
  )
}

function fillPercent(quantity: number): number {
  if (quantity <= 0) return 0
  if (quantity <= 5) return 12 + quantity * 6
  return Math.min(100, 48 + (quantity - 5) * 3)
}

function vatLabel(quantity: number): string {
  if (quantity <= 0) return 'Back in the mixing vat'
  if (quantity <= 5) return `Only ${quantity} left — going fast!`
  return 'Plenty in the vat'
}
