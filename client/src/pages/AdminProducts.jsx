import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function AdminProducts(){
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_products = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data.products || data || []);
      } catch (e) {
        console.error('Failed to fetch products:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch_products();
  }, []);

  return (
    <main className="container">
      <h1>Manage Products</h1>
      <div style={{ marginBottom: 24 }}>
        <Link to="/admin/products/new" className="button">Add New Product</Link>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>ID</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Price</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Stock</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id || p.uuid} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 8 }}>{p.id || p.uuid}</td>
                <td style={{ padding: 8 }}>{p.name}</td>
                <td style={{ padding: 8 }}>₦{parseFloat(p.price || 0).toFixed(2)}</td>
                <td style={{ padding: 8 }}>{p.stock_quantity || 0}</td>
                <td style={{ padding: 8 }}>
                  <Link to={`/admin/products/${p.id || p.uuid}/edit`} style={{ marginRight: 8 }}>Edit</Link>
                  <button onClick={() => {/* TODO: delete */}} style={{ color: 'red' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
