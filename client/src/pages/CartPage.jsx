import React from 'react'
import { useCart } from '../context/CartContext'
import { Link, useNavigate } from 'react-router-dom'

export default function CartPage(){
  const { items, updateQty, removeItem, clear } = useCart();
  const navigate = useNavigate();
  const subtotal = items.reduce((s,i)=> s + (i.price * i.quantity), 0);

  return (
    <main className="container py-16">
      <h2 className="text-3xl mb-8">Your Cart</h2>
      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="mb-4">Your cart is empty.</p>
          <Link to="/" className="text-primary hover:text-accent">Continue shopping</Link>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-[2]">
            {items.map(i => (
              <div key={i.productId} className="flex gap-3 mb-3 bg-white p-4 rounded-lg shadow-md">
                <img src={i.image || '/placeholder.png'} alt={i.name} className="w-30 h-30 object-cover rounded" />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-2">{i.name}</h4>
                  <p className="text-primary font-semibold mb-2">₦{i.price}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={()=>updateQty(i.productId, Math.max(1,i.quantity-1))}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="px-2">{i.quantity}</span>
                    <button
                      onClick={()=>updateQty(i.productId, i.quantity+1)}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    onClick={()=>removeItem(i.productId)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <aside className="flex-1 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Summary</h3>
            <p className="mb-2">Subtotal: ₦{subtotal.toFixed(2)}</p>
            <p className="mb-2">Shipping: ₦0.00</p>
            <hr className="my-4" />
            <p className="font-extrabold text-xl mb-4">Total: ₦{subtotal.toFixed(2)}</p>
            <div className="mt-3">
              <button className="cta-button w-full" onClick={()=>navigate('/checkout')}>
                Proceed to Checkout
              </button>
            </div>
            <div className="mt-2">
              <button
                onClick={()=>clear()}
                className="w-full py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear Cart
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
