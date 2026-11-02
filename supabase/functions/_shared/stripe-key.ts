import Stripe from 'npm:stripe@17.7.0';

/**
 * Choose the Stripe secret key based on where the request came from.
 *
 * - Local development (localhost / 127.0.0.1 / *.local hostnames) uses the
 *   TEST mode secret key (sk_test_...) so no real money moves.
 * - The published site keeps using the LIVE mode secret key (sk_live_...).
 *
 * Webhook handlers pass `forceLive: true` because Stripe only delivers
 * production webhooks for the live key.
 */
export function isLocalRequest(req: Request): boolean {
  const origin = req.headers.get('origin') ?? '';
  const referer = req.headers.get('referer') ?? '';
  const source = `${origin} ${referer}`.toLowerCase();

  if (
    source.includes('//localhost') ||
    source.includes('//127.0.0.1') ||
    source.includes('[::1]') ||
    source.includes('.local:') ||
    source.endsWith('.local')
  ) {
    return true;
  }

  // Direct calls with no Origin/Referer (curl, server-to-server) default to live.
  return false;
}

export function getStripeSecretKey(req: Request, forceLive = false): string {
  const testKey = Deno.env.get('STRIPE_TEST_SECRET_KEY') ?? '';

  if (!forceLive && testKey && isLocalRequest(req)) {
    return testKey;
  }

  return Deno.env.get('STRIPE_SECRET_KEY')!;
}

export function createStripeClient(req: Request, options?: {
  forceLive?: boolean;
  appInfo?: { name: string; version?: string };
}): Stripe {
  const { forceLive = false, appInfo } = options ?? {};
  return new Stripe(getStripeSecretKey(req, forceLive), {
    appInfo: appInfo ?? { name: 'Bolt Integration', version: '1.0.0' },
  });
}
