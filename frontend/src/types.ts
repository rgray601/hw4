export type ProductSummary = {
  product_id: string
  name: string
  garment_type: string
  description: string
  price: number
  image_url: string
  search_tags: string[]
}

export type SizeStock = {
  size: string
  quantity: number
}

export type ProductDetail = ProductSummary & {
  colors: string[]
  sizes: SizeStock[]
}

export type Shopper = {
  id: number
  first_name: string
  last_name: string
  email: string
  name: string
}
