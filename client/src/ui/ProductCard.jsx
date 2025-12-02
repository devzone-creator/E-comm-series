import React from 'react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem(product, 1);
  };

  const image =
    product.imageUrl ||
    product.image_url ||
    (product.images && product.images[0]) ||
    '/placeholder.png';

  return (
    <div className="bg-white p-4 rounded-lg shadow-md transition-transform duration-300 hover:-translate-y-1">
      <img src={image} alt={product.name} className="w-full h-48 object-cover rounded bg-gray-100" />
      <h3 className="mt-4 mb-2 text-lg font-semibold">{product.name}</h3>
      {product.description && (
        <p className="text-gray-600 text-sm my-2 leading-relaxed min-h-[40px]">
          {product.description}
        </p>
      )}
      {product.price && (
        <p className="text-xl font-bold text-primary my-2">
          ₦
          {product.price}
        </p>
      )}
      {typeof product.stockQuantity === 'number' && (
        <p className="text-green-600 text-sm font-bold my-2">
          In stock:
          {' '}
          {product.stockQuantity}
        </p>
      )}
      <button
        type="button"
        onClick={handleAddToCart}
        className="w-full py-2.5 bg-primary text-white border-none rounded cursor-pointer transition-all duration-300 hover:bg-accent"
      >
        Add to Cart
      </button>
    </div>
  );
}
