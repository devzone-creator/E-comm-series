import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-secondary text-white/80 py-12 mt-16">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white text-xl font-serif mb-4">ATC AfriGlam</h3>
            <p>Celebrating African heritage through contemporary fashion.</p>
          </div>
          <div>
            <h4 className="text-white mb-4 font-semibold">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-accent transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-accent transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/" className="hover:text-accent transition-colors">Shop</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white mb-4 font-semibold">Contact Us</h4>
            <p>Email: info@atcafriglam.com</p>
            <p>Phone: +123-456-7890</p>
          </div>
        </div>
        <div className="pt-6 border-t border-white/10 text-center">
          <p>&copy; 2024 ATC AfriGlam. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

