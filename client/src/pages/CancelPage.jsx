import React from 'react'
import { Link } from 'react-router-dom'

export default function CancelPage(){
  return (
    <main className="container">
      <h2>Payment Cancelled</h2>
      <p>Your payment was cancelled. You can try again or continue shopping.</p>
      <p><Link to="/cart">View Cart</Link></p>
    </main>
  )
}
