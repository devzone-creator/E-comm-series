import React from 'react'
import { useCart } from '../context/CartContext'
import { Link, useNavigate } from 'react-router-dom'

export default function CartPage(){
  const { items, updateQty, removeItem, clear } = useCart();
  const navigate = useNavigate();
  const subtotal = items.reduce((s,i)=> s + (i.price * i.quantity), 0);

  return (
    <main className="container">
      <h2>Your Cart</h2>
      {items.length === 0 ? (
        <div>
          <p>Your cart is empty.</p>
          <Link to="/">Continue shopping</Link>
        </div>
      ) : (
        <div style={{display:'flex', gap:24}}>
          <div style={{flex:2}}>
            {items.map(i => (
              <div key={i.productId} style={{display:'flex', gap:12, marginBottom:12}} className="card">
                <img src={i.image || '/placeholder.png'} alt={i.name} style={{width:120, height:120, objectFit:'cover'}} />
                <div style={{flex:1}}>
                  <h4>{i.name}</h4>
                  <p>₦{i.price}</p>
                  <div>
                    <button onClick={()=>updateQty(i.productId, Math.max(1,i.quantity-1))}>-</button>
                    <span style={{padding:'0 8px'}}>{i.quantity}</span>
                    <button onClick={()=>updateQty(i.productId, i.quantity+1)}>+</button>
                  </div>
                </div>
                <div>
                  <button onClick={()=>removeItem(i.productId)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <aside style={{flex:1}} className="card">
            <h3>Summary</h3>
            <p>Subtotal: ₦{subtotal.toFixed(2)}</p>
            <p>Shipping: ₦0.00</p>
            <hr />
            <p style={{fontWeight:800}}>Total: ₦{subtotal.toFixed(2)}</p>
            <div style={{marginTop:12}}>
              <button className="button" onClick={()=>navigate('/checkout')}>Proceed to Checkout</button>
            </div>
            <div style={{marginTop:8}}>
              <button onClick={()=>clear()}>Clear Cart</button>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
