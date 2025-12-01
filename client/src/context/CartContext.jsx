import React, { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext();

export function useCart(){
  return useContext(CartContext);
}

export function CartProvider({ children }){
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('cart', JSON.stringify(items)); } catch(e){}
  }, [items]);

  function addItem(product, quantity=1){
    setItems(prev => {
      const found = prev.find(i => i.productId === product.id);
      if (found) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, image: product.image_url || (product.images && product.images[0]) || '', quantity }];
    });
  }

  function updateQty(productId, quantity){
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity } : i).filter(i => i.quantity > 0));
  }

  function removeItem(productId){
    setItems(prev => prev.filter(i => i.productId !== productId));
  }

  function clear(){ setItems([]); }

  const value = { items, addItem, updateQty, removeItem, clear };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
