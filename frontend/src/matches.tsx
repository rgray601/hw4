import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { ChatProduct } from './api.ts'

type Matches = {
  products: ChatProduct[]
  question: string
  setMatches: (question: string, products: ChatProduct[]) => void
}

const MatchesContext = createContext<Matches | null>(null)

export function MatchesProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ChatProduct[]>([])
  const [question, setQuestion] = useState('')

  return (
    <MatchesContext.Provider
      value={{
        products,
        question,
        setMatches(nextQuestion, nextProducts) {
          setQuestion(nextQuestion)
          setProducts(nextProducts)
        },
      }}
    >
      {children}
    </MatchesContext.Provider>
  )
}

export function useMatches(): Matches {
  const value = useContext(MatchesContext)
  if (!value) throw new Error('MatchesProvider is missing')
  return value
}
