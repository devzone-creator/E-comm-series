import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function AdminDashboard(){
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/orders')
        ]);
        const productsData = await productsRes.json();
        const ordersData = await ordersRes.json();
        
        const products = productsData.products || productsData || [];
        const orders = ordersData.orders || ordersData || [];
        const revenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        
        setStats({
          totalProducts: products.length,
          totalOrders: orders.length,
          totalRevenue: revenue
        });
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <main className="container">
      <h1>Admin Dashboard</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Products</h3>
              <p style={{ fontSize: '2em', fontWeight: 'bold' }}>{stats.totalProducts}</p>
            </div>
            <div className="stat-card">
              <h3>Total Orders</h3>
              <p style={{ fontSize: '2em', fontWeight: 'bold' }}>{stats.totalOrders}</p>
            </div>
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <p style={{ fontSize: '2em', fontWeight: 'bold' }}>₦{stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
          
          <div style={{ marginTop: 32 }}>
            <h2>Management</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/admin/products" className="button">Manage Products</Link>
              <Link to="/admin/orders" className="button">Manage Orders</Link>
              <Link to="/admin/inventory" className="button">Inventory</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
