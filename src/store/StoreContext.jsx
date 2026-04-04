import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [cart, setCart] = useState([]);
  const [ownedImageIds, setOwnedImageIds] = useState(new Set());

  const creditBalance = profile?.credit_balance ?? 0;

  useEffect(() => {
    if (!user) {
      setOwnedImageIds(new Set());
      return;
    }
    const loadOwned = async () => {
      const { data } = await supabase
        .from('purchases')
        .select('items')
        .eq('user_id', user.id);
      const ids = new Set(
        (data ?? []).flatMap((p) => (p.items ?? []).map((item) => item.id))
      );
      setOwnedImageIds(ids);
    };
    loadOwned();
  }, [user]);

  const isOwned = (id) => ownedImageIds.has(id);

  const addToCart = (item) => {
    if (ownedImageIds.has(item.id)) {
      return { alreadyOwned: true };
    }
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    return { alreadyOwned: false };
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

    const alreadyOwnedItems = cart.filter((item) => ownedImageIds.has(item.id));
    if (alreadyOwnedItems.length > 0) {
      return {
        success: false,
        message: `You already own: ${alreadyOwnedItems.map((i) => i.title).join(', ')}. Remove them from your cart before checking out.`,
      };
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

    const newIds = new Set([...ownedImageIds, ...purchaseItems.map((i) => i.id)]);
    setOwnedImageIds(newIds);

    await refreshProfile();
    clearCart();
    return { success: true, message: 'Checkout complete. Enjoy your downloads!' };
  };

  return (
    <StoreContext.Provider
      value={{ creditBalance, cart, cartTotal, addToCart, removeFromCart, clearCart, checkout, isOwned, ownedImageIds }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
