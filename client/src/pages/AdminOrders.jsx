import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function AdminOrders(){
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        setOrders(data.orders || data || []);
      } catch (e) {
        console.error('Failed to fetch orders:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <main className="container">
      <h1>Manage Orders</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Order #</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Total</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Payment</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 8 }}>{o.order_number}</td>
                <td style={{ padding: 8 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                <td style={{ padding: 8 }}>₦{parseFloat(o.total_amount || 0).toFixed(2)}</td>
                <td style={{ padding: 8 }}><strong>{o.status}</strong></td>
                <td style={{ padding: 8 }}>{o.payment_status}</td>
                <td style={{ padding: 8 }}>
                  <Link to={`/admin/orders/${o.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
