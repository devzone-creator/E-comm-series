import React from 'react'
import { Link } from 'react-router-dom'

export default function ProductCard({ product }){
  return (
    <div className="card">
      <img src={product.image_url || (product.images && product.images[0]) || '/placeholder.png'} alt={product.name} />
      <h3>{product.name}</h3>
      <p style={{fontWeight:700}}>{product.price ? `₦${product.price}` : ''}</p>
      <Link to={`/product/${product.id}`} className="button">View</Link>
    </div>
  )
}
