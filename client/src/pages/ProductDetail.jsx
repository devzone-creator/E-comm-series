import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function ProductDetail(){
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const navigate = useNavigate();
  const { addItem } = useCart();

  useEffect(()=>{
    const q = async ()=>{
      try{
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        setProduct(data.product || data);
      }catch(e){ console.error(e); }
    }
    q();
  },[id]);

  if (!product) return <div className="container"><p>Loading...</p></div>

  return (
    <main className="container">
      <div style={{display:'flex', gap:24}}>
        <div style={{flex:1}}>
          <img src={product.image_url || (product.images && product.images[0]) || '/placeholder.png'} alt={product.name} style={{width:'100%', maxHeight:420, objectFit:'cover'}} />
        </div>
        <div style={{flex:1}}>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <p style={{fontWeight:800}}>{product.price ? `₦${product.price}` : ''}</p>
          <div style={{marginTop:12}}>
            <button onClick={()=>setQty(q=>Math.max(1,q-1))}>-</button>
            <input style={{width:40, textAlign:'center'}} value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value||1)))} />
            <button onClick={()=>setQty(q=>q+1)}>+</button>
          </div>
          <div style={{marginTop:12}}>
            <button className="button" onClick={()=>{ addItem(product, qty); navigate('/cart'); }}>Add to cart</button>
          </div>
        </div>
      </div>
    </main>
  )
}
