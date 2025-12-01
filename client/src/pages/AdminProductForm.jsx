import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function AdminProductForm(){
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    category: 'fashion',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/products' : `/api/products/${id}`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (!res.ok) throw new Error('Failed to save product');
      
      navigate('/admin/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h1>{isNew ? 'Add New Product' : 'Edit Product'}</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
        <div style={{ marginBottom: 12 }}>
          <label>Name</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={4} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Price</label>
          <input type="number" name="price" value={form.price} onChange={handleChange} step="0.01" required />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Stock Quantity</label>
          <input type="number" name="stock_quantity" value={form.stock_quantity} onChange={handleChange} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Category</label>
          <select name="category" value={form.category} onChange={handleChange}>
            <option>fashion</option>
            <option>beauty</option>
            <option>accessories</option>
            <option>home</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Image URL</label>
          <input type="url" name="image_url" value={form.image_url} onChange={handleChange} />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button className="button" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Product'}</button>
      </form>
    </main>
  )
}
