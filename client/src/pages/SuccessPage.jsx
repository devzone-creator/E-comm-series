import React from 'react'
import { Link } from 'react-router-dom'

export default function SuccessPage(){
  return (
    <main className="container">
      <h2>Thank you — Order placed</h2>
      <p>Your payment was successful and your order is being processed.</p>
      <p><Link to="/">Continue shopping</Link></p>
    </main>
  )
}
