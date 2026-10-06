import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { getCoverDisplayUrl } from '../lib/magazines';
import { useAuth } from '../store/AuthContext';

function AccessBadge({ reason }) {
  if (reason === 'subscription') return <span className="magazine-badge magazine-badge--sub">Included with subscription</span>;
  if (reason === 'entitlement') return <span className="magazine-badge magazine-badge--owned">Owned</span>;
  if (reason === 'admin') return <span className="magazine-badge magazine-badge--admin">Admin</span>;
  if (reason === 'free') return <span className="magazine-badge magazine-badge--free">Free</span>;
  return null;
}

export default function MagazinesPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [magazines, setMagazines] = useState([]);
  const [settings, setSettings] = useState(null);
  const [accessMap, setAccessMap] = useState({});
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    async function load() {
      const [magRes, settingsRes] = await Promise.all([
        supabase.from('magazines').select('*').eq('status', 'published').order('published_at', { ascending: false }),
        supabase.from('magazine_settings').select('*').maybeSingle(),
      ]);
      const mags = magRes.data || [];

      // Prefer the published front-cover image (reader page 0) over the
      // studio's low-res editor thumbnail stored in cover_url.
      const { data: coverRows } = await supabase
        .from('magazine_reader_pages')
        .select('magazine_id, image')
        .eq('page_index', 0)
        .in('magazine_id', mags.map((m) => m.id));
      const coverMap = {};
      (coverRows || []).forEach((row) => { coverMap[row.magazine_id] = row.image; });

      setMagazines(
        mags.map((m) => ({ ...m, cover_url: coverMap[m.id] || m.cover_url })),
      );
      setSettings(settingsRes.data);

      if (!user) return;

      const isAdmin = profile?.is_admin ?? false;
      if (isAdmin) {
        const map = {};
        mags.forEach(m => { map[m.id] = 'admin'; });
        setAccessMap(map);
        return;
      }

      const [entRes, subRes] = await Promise.all([
        supabase
          .from('magazine_entitlements')
          .select('magazine_id')
          .eq('user_id', user.id)
          .is('revoked_at', null),
        supabase
          .from('magazine_subscriptions')
          .select('status, current_period_end')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle(),
      ]);

      const ownedIds = new Set((entRes.data || []).map(r => r.magazine_id));
      const sub = subRes.data;
      const hasActiveSub = sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

      const map = {};
      mags.forEach(m => {
        if (ownedIds.has(m.id)) map[m.id] = 'entitlement';
        else if (hasActiveSub) map[m.id] = 'subscription';
        else if (!m.digital_price || m.digital_price === 0) map[m.id] = 'free';
      });
      setAccessMap(map);
    }
    load();
  }, [user?.id, profile?.is_admin]);

  async function startSubscriptionCheckout() {
    if (!user) { navigate('/login'); return; }
    setCheckingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/magazine-subscription-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            success_url: `${window.location.origin}/magazines`,
            cancel_url: window.location.href,
          }),
        },
      );
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch { /* stay on page */ }
    setCheckingOut(false);
  }

  const subPrice = settings?.subscription_price_display
    ? `$${Number(settings.subscription_price_display).toFixed(2)}`
    : null;

  const userHasActiveSub = Object.values(accessMap).some(r => r === 'subscription');

  return (
    <Layout>
      <main className="magazine-public-page">
        <header className="magazine-public-header">
          <div>
            <p className="eyebrow">The magazine</p>
            <h1>Field Notes</h1>
            <p>Limited digital editions of landscapes, stories, and photographs from the road.</p>
          </div>
          {settings?.subscription_enabled && !userHasActiveSub && subPrice && (
            <button className="btn" type="button" disabled={checkingOut} onClick={startSubscriptionCheckout}>
              Subscribe — {subPrice}/month
            </button>
          )}
          {userHasActiveSub && (
            <Link className="btn" to="/my-library">Your library</Link>
          )}
        </header>

        {settings?.subscription_enabled && !userHasActiveSub && (
          <section className="magazine-subscribe-card magazine-subscribe-card--hero">
            <div className="magazine-subscribe-card-inner">
              <div>
                <p className="eyebrow">Subscription</p>
                <h2>{settings.homepage_widget_title || 'Read every issue.'}</h2>
                <p>{settings.homepage_widget_copy || 'Subscribe to access the full magazine library. New issues released during your subscription are permanently added to your collection.'}</p>
                <ul className="magazine-subscribe-bullets">
                  <li>Unlimited access to every published magazine while subscribed</li>
                  <li>New monthly issues permanently added to your library</li>
                  <li>Cancel anytime</li>
                  <li>Permanent access to issues you own</li>
                </ul>
              </div>
              <div className="magazine-subscribe-actions">
                {subPrice && (
                  <p className="magazine-sub-price">{subPrice}<span> /month</span></p>
                )}
                <button className="btn" type="button" disabled={checkingOut} onClick={startSubscriptionCheckout}>
                  Subscribe now
                </button>
                {!user && (
                  <Link className="ghost" to="/login">Sign in</Link>
                )}
              </div>
            </div>
          </section>
        )}

        {userHasActiveSub && (
          <section className="magazine-subscribe-card magazine-subscribe-card--active">
            <p className="eyebrow">Subscription active</p>
            <h2>You have full access</h2>
            <p>Read every published magazine in the library. New issues are permanently added to your collection.</p>
            <Link className="btn" to="/my-library">View your library</Link>
          </section>
        )}

        <section className="magazine-catalog">
          {magazines.map((magazine) => {
            const reason = accessMap[magazine.id];
            const isAccessible = !!reason;
            return (
              <Link
                className="magazine-catalog-card"
                to={`/magazines/${magazine.slug}`}
                key={magazine.id}
              >
                {magazine.cover_url
                  ? <img src={getCoverDisplayUrl(magazine.cover_url, 900)} alt={magazine.title} />
                  : <div className="magazine-catalog-placeholder">CW</div>}
                <div>
                  <div className="magazine-catalog-badges">
                    <AccessBadge reason={reason} />
                  </div>
                  <p className="eyebrow">Edition</p>
                  <h2>{magazine.title}</h2>
                  <p>{magazine.description}</p>
                  {isAccessible
                    ? <strong className="magazine-catalog-cta">Read magazine</strong>
                    : <strong className="magazine-catalog-price">
                        {settings?.subscription_enabled && subPrice
                          ? `${subPrice} to subscribe`
                          : Number(magazine.digital_price) > 0
                            ? `$${Number(magazine.digital_price).toFixed(2)} digital`
                            : 'Read free online'}
                      </strong>}
                </div>
              </Link>
            );
          })}
        </section>

        {!magazines.length && (
          <div className="magazine-reader-state">The next edition is being prepared.</div>
        )}

      </main>
    </Layout>
  );
}
