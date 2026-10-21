export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

export function stockLabel(quantity: number): string {
  if (quantity <= 0) return 'Out of stock'
  if (quantity === 1) return '1 in stock'
  return `${quantity} in stock`
}
