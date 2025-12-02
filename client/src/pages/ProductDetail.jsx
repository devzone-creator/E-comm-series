import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { API_URL } from '../config/api';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const navigate = useNavigate();
  const { addItem } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}/products/${id}`);
        const data = await res.json();
        setProduct(data.product || data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <main className="container py-16">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container py-16">
        <div className="text-center">
          <h2 className="text-2xl mb-4">Product not found</h2>
          <Link to="/" className="text-primary hover:text-accent">Return to shop</Link>
        </div>
      </main>
    );
  }

  const image = product.imageUrl || product.image_url || (product.images && product.images[0]) || '/placeholder.png';

  return (
    <main className="container py-16">
      <Link to="/" className="text-primary hover:text-accent mb-4 inline-block">← Back to shop</Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8">
        <div className="bg-white rounded-lg overflow-hidden shadow-lg">
          <img
            src={image}
            alt={product.name}
            className="w-full h-[500px] object-cover"
          />
        </div>
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-serif text-secondary mb-4">{product.name}</h1>
            <p className="text-3xl font-bold text-primary mb-6">
              {product.price ? `₦${parseFloat(product.price).toFixed(2)}` : 'Price not available'}
            </p>
          </div>
          
          {product.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>
          )}

          {typeof product.stockQuantity === 'number' && (
            <div>
              <p className={`font-semibold ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stockQuantity > 0 ? `In Stock: ${product.stockQuantity}` : 'Out of Stock'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t">
            <label className="font-semibold">Quantity:</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 bg-gray-200 rounded hover:bg-gray-300 font-bold"
                disabled={qty <= 1}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || 1)))}
                className="w-16 h-10 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-10 h-10 bg-gray-200 rounded hover:bg-gray-300 font-bold"
              >
                +
              </button>
            </div>
          </div>

          <button
            className="cta-button w-full text-lg py-4"
            onClick={() => {
              addItem(product, qty);
              navigate('/cart');
            }}
            disabled={product.stockQuantity === 0}
          >
            {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </main>
  );
}
