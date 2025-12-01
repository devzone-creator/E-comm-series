import React, { useState } from 'react'
import { useCart } from '../context/CartContext'

export default function CheckoutPage(){
  const { items } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStripe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/checkout/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ payment: { method: 'stripe' } })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Checkout failed');
      }
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('No redirect URL received from Stripe');
      }
    } catch (err) {
      setError(err.message || 'Checkout error');
      setLoading(false);
    }
  }

  const total = items.reduce((s,i)=> s + (i.price * i.quantity), 0);

  return (
    <main className="container">
      <h2>Checkout</h2>
      <div style={{display:'flex', gap:24}}>
        <section style={{flex:2}}>
          <h3>Shipping</h3>
          <p>We'll collect shipping details on the next page after payment (simplified).</p>
        </section>
        <aside style={{flex:1}} className="card">
          <h3>Order</h3>
          <p>Items: {items.length}</p>
          <p>Total: ₦{total.toFixed(2)}</p>
          <div style={{marginTop:12}}>
            <button className="button" disabled={loading || items.length===0} onClick={handleStripe}>{loading ? 'Redirecting...' : 'Pay with Card (Stripe)'}</button>
          </div>
          {error && <p style={{color:'red'}}>{error}</p>}
        </aside>
      </div>
    </main>
  )
}
