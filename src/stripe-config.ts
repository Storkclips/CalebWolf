export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
  currencySymbol: string;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_TvPrfdurV2Tsfe',
    priceId: 'price_1SxZ1nQsBFyT5mbBGOll9aOs',
    name: 'Credits',
    description: 'Monthly credit subscription for premium features',
    mode: 'subscription',
    price: 10.00,
    currency: 'usd',
    currencySymbol: '$'
  }
];

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}