import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type BasketLine = {
  product_id: string
  name: string
  price: number
  image_url: string
  picked: number
}

type BasketItem = Omit<BasketLine, 'picked'>

type BasketValue = {
  lines: BasketLine[]
  open: boolean
  confirmed: boolean
  setOpen: (open: boolean) => void
  add: (item: BasketItem) => void
  checkout: () => void
}

const BasketContext = createContext<BasketValue | null>(null)

export function BasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>([])
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const value = useMemo<BasketValue>(
    () => ({
      lines,
      open,
      confirmed,
      setOpen,
      add(item) {
        setConfirmed(false)
        setLines((current) => {
          const found = current.find((line) => line.product_id === item.product_id)
          if (!found) return [...current, { ...item, picked: 1 }]
          return current.map((line) =>
            line.product_id === item.product_id ? { ...line, picked: line.picked + 1 } : line,
          )
        })
        setOpen(true)
      },
      checkout() {
        setConfirmed(true)
      },
    }),
    [lines, open, confirmed],
  )

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>
}

export function useBasket(): BasketValue {
  const value = useContext(BasketContext)
  if (!value) throw new Error('BasketProvider is missing')
  return value
}
