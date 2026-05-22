export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  mode: 'payment' | 'subscription';
  credits: number;
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_UZBHpaSdJxTwUf',
    priceId: 'price_1Ta2vNClDBdzIubc3rLZt4ju',
    name: '10 Credits',
    description: 'Perfect for trying out our services',
    price: 10.00,
    currency: 'usd',
    mode: 'payment',
    credits: 10
  },
  {
    id: 'prod_UZBJsqpkHLaFs8',
    priceId: 'price_1Ta2xJClDBdzIubcizYhErsG',
    name: '50 Credits',
    description: 'Great value for regular users',
    price: 50.00,
    currency: 'usd',
    mode: 'payment',
    credits: 50
  },
  {
    id: 'prod_UZBKVI2xG0K1sC',
    priceId: 'price_1Ta2y9ClDBdzIubc2xnM2cFJ',
    name: '100 Credits',
    description: 'Best value for power users',
    price: 100.00,
    currency: 'usd',
    mode: 'payment',
    credits: 100
  }
];

export const formatPrice = (price: number, currency: string = 'usd'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(price);
};