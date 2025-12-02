import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../ui/ProductCard';
import { API_URL } from '../config/api';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        setProducts(data.products || data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <main>
      <section className="bg-gradient-to-r from-black/50 to-black/50 bg-cover bg-center bg-no-repeat h-[70vh] min-h-[500px] flex items-center text-white text-center" style={{ backgroundImage: "url('https://placehold.co/1920x1080')" }}>
        <div className="container">
          <h1 className="text-5xl md:text-6xl mb-4 text-white drop-shadow-lg">Welcome to ATC AfriGlam</h1>
          <p className="text-2xl md:text-3xl mb-8">Elevate your style with authentic African fashion!</p>
          <Link to="/" className="cta-button">
            Shop Now
          </Link>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-4xl text-center mb-12 text-secondary">Featured Collections</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-2">
              <div className="h-64 overflow-hidden">
                <img
                  src="https://placehold.co/600x400"
                  alt="Vibrant African prints clothing collection"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Bold &amp; Beautiful Prints</h3>
                <p>Vibrant, hand-crafted apparel that celebrates African heritage.</p>
              </div>
            </div>
            <div className="bg-white rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-2">
              <div className="h-64 overflow-hidden">
                <img
                  src="https://placehold.co/600x400"
                  alt="Traditional African jewelry collection"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Elegant Accessories</h3>
                <p>Traditional African necklaces, bracelets, and statement pieces.</p>
              </div>
            </div>
            <div className="bg-white rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-2">
              <div className="h-64 overflow-hidden">
                <img
                  src="https://placehold.co/600x400"
                  alt="Exclusive limited edition African fashion"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Limited Edition Pieces</h3>
                <p>Exclusive, unique designs you won&apos;t find anywhere else.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-light-bg">
        <div className="container">
          <h2 className="text-4xl text-center mb-12 text-secondary">Shop Our Collection</h2>
          {loading ? (
            <p className="text-center">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((p) => (
                <ProductCard key={p.id || p.uuid} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
