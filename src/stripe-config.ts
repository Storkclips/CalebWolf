export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
  currencySymbol: string;
  credits: number;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_TvPrfdurV2Tsfe',
    priceId: 'price_1SxZ1nQsBFyT5mbBGOll9aOs',
    name: '50 Credits',
    description: '50 credits per month to spend on image downloads',
    mode: 'subscription',
    price: 10.00,
    currency: 'usd',
    currencySymbol: '$',
    credits: 50,
  }
];

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}
