import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ProductDetail from './pages/ProductDetail'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import SuccessPage from './pages/SuccessPage'
import CancelPage from './pages/CancelPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminProducts from './pages/AdminProducts'
import AdminProductForm from './pages/AdminProductForm'
import AdminOrders from './pages/AdminOrders'
import AdminOrderDetail from './pages/AdminOrderDetail'
import AdminInventory from './pages/AdminInventory'
import Header from './components/Header'
import { CartProvider } from './context/CartContext'

export default function App(){
  return (
    <BrowserRouter>
      <CartProvider>
        <Header />
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/product/:id" element={<ProductDetail/>} />
          <Route path="/cart" element={<CartPage/>} />
          <Route path="/checkout" element={<CheckoutPage/>} />
          <Route path="/success" element={<SuccessPage/>} />
          <Route path="/cancel" element={<CancelPage/>} />
          <Route path="/admin" element={<AdminDashboard/>} />
          <Route path="/admin/products" element={<AdminProducts/>} />
          <Route path="/admin/products/new" element={<AdminProductForm/>} />
          <Route path="/admin/products/:id/edit" element={<AdminProductForm/>} />
          <Route path="/admin/orders" element={<AdminOrders/>} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetail/>} />
          <Route path="/admin/inventory" element={<AdminInventory/>} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  )
}

