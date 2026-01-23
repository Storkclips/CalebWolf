import { createContext, useContext, useState } from 'react';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [creditBalance, setCreditBalance] = useState(25);
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((entry) => entry.id !== id));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const checkout = () => {
    if (cartTotal > creditBalance) {
      return { success: false, message: 'Not enough credits for this purchase.' };
    }
    setCreditBalance((balance) => balance - cartTotal);
    clearCart();
    return { success: true, message: 'Checkout complete. Enjoy your downloads!' };
  };

  return (
    <StoreContext.Provider
      value={{ creditBalance, cart, cartTotal, addToCart, removeFromCart, clearCart, checkout }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
