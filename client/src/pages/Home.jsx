import React, { useEffect, useState } from 'react'
import ProductCard from '../ui/ProductCard'

export default function Home(){
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const q = async () => {
      try{
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data.products || data);
      }catch(e){ console.error(e); }
      setLoading(false);
    }
    q();
  },[])

  return (
    <main className="container">
      <h2>Featured Products</h2>
      {loading ? <p>Loading...</p> : (
        <div className="grid">
          {products.map(p => <ProductCard key={p.id || p.uuid} product={p} />)}
        </div>
      )}
    </main>
  )
}
