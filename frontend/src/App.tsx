import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth.tsx'
import { BasketProvider } from './basket.tsx'
import { CandyBasket } from './components/CandyBasket.tsx'
import { ChatMatches } from './components/ChatMatches.tsx'
import { ChatWidget } from './components/ChatWidget.tsx'
import { Footer } from './components/Footer.tsx'
import { NavBar } from './components/NavBar.tsx'
import { MatchesProvider } from './matches.tsx'
import { AboutPage } from './pages/AboutPage.tsx'
import { CreateAccountPage } from './pages/CreateAccountPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { ProductPage } from './pages/ProductPage.tsx'
import { ProductsPage } from './pages/ProductsPage.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BasketProvider>
          <MatchesProvider>
            <div className="site">
              <NavBar />
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/:productId" element={<ProductPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/create-account" element={<CreateAccountPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
                <ChatMatches />
              </main>
              <Footer />
              <CandyBasket />
              <ChatWidget />
            </div>
          </MatchesProvider>
        </BasketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
