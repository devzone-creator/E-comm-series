import React from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function Header(){
  const { items } = useCart();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <header className="container header">
      <div className="brand"><Link to="/">AfriGlam</Link></div>
      <div>
        <input className="search" placeholder="Search products..." id="search" />
        <Link to="/cart" className="button">Cart <span className="cart-badge">{count}</span></Link>
      </div>
    </header>
  )
}
