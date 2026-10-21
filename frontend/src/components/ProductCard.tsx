import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBasket } from '../basket.tsx'
import { formatPrice } from '../format.ts'
import { isGolden } from '../ticket.ts'

type CardProduct = {
  product_id: string
  name: string
  garment_type: string
  description: string
  price: number
  image_url: string
}

export function ProductCard({ product }: { product: CardProduct }) {
  const { add } = useBasket()
  const golden = isGolden(product.product_id)
  const [celebrate, setCelebrate] = useState(false)

  return (
    <article className={`card${golden ? ' golden' : ''}`}>
      <Link className="card-link" to={`/products/${product.product_id}`}>
        <div className="photo-frame">
          <img src={product.image_url} alt={product.name} loading="lazy" />
        </div>
        <div className="card-body">
          <p className="garment">{product.garment_type}</p>
          <p className="card-title">{product.name}</p>
          <p className="price">{formatPrice(product.price)}</p>
          <p className="blurb">{product.description}</p>
        </div>
      </Link>
      {golden ? (
        <button
          type="button"
          className="ticket-badge"
          onClick={() => setCelebrate(true)}
        >
          Golden ticket
        </button>
      ) : null}
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
      {celebrate ? (
        <div className="ticket-pop" role="status">
          <span className="confetti" aria-hidden="true" />
          <p>A golden ticket! Demo code YALE-FACTORY. The catalogue price above stays the real one.</p>
          <button type="button" onClick={() => setCelebrate(false)}>
            Tuck it away
          </button>
        </div>
      ) : null}
    </article>
  )
}
