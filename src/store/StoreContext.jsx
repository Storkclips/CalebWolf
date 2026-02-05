import { createContext, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [cart, setCart] = useState([]);

  const creditBalance = profile?.credit_balance ?? 0;

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

  const checkout = async () => {
    if (!user) {
      return { success: false, message: 'Please sign in to complete your purchase.' };
    }

    if (cartTotal > creditBalance) {
      return { success: false, message: 'Not enough credits for this purchase.' };
    }

    const newBalance = creditBalance - cartTotal;

    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ credit_balance: newBalance })
      .eq('id', user.id);

    if (balanceError) {
      return { success: false, message: 'Something went wrong. Please try again.' };
    }

    const purchaseItems = cart.map((item) => ({
      id: item.id,
      title: item.title,
      collectionTitle: item.collectionTitle,
      price: item.price,
      quantity: item.quantity,
      preview: item.preview,
    }));

    await supabase.from('purchases').insert({
      user_id: user.id,
      items: purchaseItems,
      total_credits: cartTotal,
    });

    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: -cartTotal,
      type: 'purchase',
      description: `Purchased ${cart.length} image(s)`,
    });

    await refreshProfile();
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
