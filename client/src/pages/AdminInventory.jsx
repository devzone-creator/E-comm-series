import React, { useEffect, useState } from 'react'

export default function AdminInventory(){
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        setInventory(data.inventory || data || []);
      } catch (e) {
        console.error('Failed to fetch inventory:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  return (
    <main className="container">
      <h1>Inventory Management</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Product</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Stock</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Reserved</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Available</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => {
              const reserved = item.reserved_quantity || 0;
              const available = (item.stock_quantity || 0) - reserved;
              const status = available <= 5 ? 'Low Stock' : available === 0 ? 'Out of Stock' : 'In Stock';
              const statusColor = status === 'Low Stock' ? '#ff9800' : status === 'Out of Stock' ? '#f44336' : '#4caf50';
              
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: 8 }}>{item.product_name}</td>
                  <td style={{ padding: 8 }}>{item.stock_quantity || 0}</td>
                  <td style={{ padding: 8 }}>{reserved}</td>
                  <td style={{ padding: 8 }}>{available}</td>
                  <td style={{ padding: 8, color: statusColor, fontWeight: 'bold' }}>{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}
