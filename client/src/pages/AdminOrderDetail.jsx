import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function AdminOrderDetail(){
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();
        setOrder(data.order || data);
      } catch (e) {
        console.error('Failed to fetch order:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) return <main className="container"><p>Loading...</p></main>;
  if (!order) return <main className="container"><p>Order not found</p></main>;

  return (
    <main className="container">
      <h1>Order #{order.order_number}</h1>
      <div style={{ display: 'flex', gap: 32 }}>
        <div style={{ flex: 1 }}>
          <h3>Order Details</h3>
          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Payment Status:</strong> {order.payment_status}</p>
          <p><strong>Total:</strong> ₦{parseFloat(order.total_amount || 0).toFixed(2)}</p>
          <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
          
          <h3 style={{ marginTop: 24 }}>Shipping Address</h3>
          {order.shipping_address ? (
            <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4 }}>
              {typeof order.shipping_address === 'string' 
                ? order.shipping_address 
                : JSON.stringify(order.shipping_address, null, 2)
              }
            </pre>
          ) : (
            <p>No shipping address</p>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h3>Items</h3>
          {order.items && Array.isArray(order.items) ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Product</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Qty</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: 8 }}>{item.product_name || 'Unknown'}</td>
                    <td style={{ padding: 8 }}>{item.quantity}</td>
                    <td style={{ padding: 8 }}>₦{parseFloat(item.product_price || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No items in order</p>
          )}
        </div>
      </div>
    </main>
  )
}
