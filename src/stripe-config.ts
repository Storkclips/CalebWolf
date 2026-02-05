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
    id: 'prod_TvPrfdurV2Tsfe',
    priceId: 'price_1SxZ1nQsBFyT5mbBGOll9aOs',
    name: '10 Credits',
    description: 'Perfect for trying out our services',
    price: 10.00,
    currency: 'usd',
    mode: 'payment',
    credits: 10
  },
  {
    id: 'prod_TvQ1Etq59WqvsE',
    priceId: 'price_1SxZBeQsBFyT5mbBL8zVOpbC',
    name: '50 Credits',
    description: 'Great value for regular users',
    price: 50.00,
    currency: 'usd',
    mode: 'payment',
    credits: 50
  },
  {
    id: 'prod_TvQ1JhRCDW1cxw',
    priceId: 'price_1SxZBLQsBFyT5mbBYS6E6CW1',
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