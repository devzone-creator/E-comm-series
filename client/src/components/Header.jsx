import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { items } = useCart();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      setUser(raw ? JSON.parse(raw) : null);
    } catch (e) {
      setUser(null);
    }
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.clear();
    setUser(null);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 bg-white shadow-lg z-[1000] py-4">
      <div className="container flex justify-between items-center">
        <div>
          <Link to="/" className="font-serif text-3xl font-bold text-primary">
            ATC AfriGlam
          </Link>
        </div>

        <nav className="flex gap-8">
          <NavLink to="/" className="text-dark-text font-semibold hover:text-accent">
            Home
          </NavLink>
          <NavLink to="/" className="text-dark-text font-semibold hover:text-accent">
            Shop
          </NavLink>
          <NavLink to="/about" className="text-dark-text font-semibold hover:text-accent">
            About
          </NavLink>
          {user && user.role === 'ADMIN' && (
            <NavLink to="/admin" className="text-dark-text font-semibold hover:text-accent">
              Admin
            </NavLink>
          )}
          {!user ? (
            <NavLink to="/login" className="text-dark-text font-semibold hover:text-accent">
              Login
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="text-dark-text font-semibold hover:text-accent bg-transparent border-none p-0 cursor-pointer"
            >
              Logout
            </button>
          )}
        </nav>

        <div className="relative ml-6">
          <Link to="/cart" className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 3h2l.4 2M7 13h10l1.5-7H6.5L5 3H1M7 13l-1 5a2 2 0 002 2h10a2 2 0 002-2l-1-5M7 13h10"
              />
            </svg>
            <span className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {count}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
