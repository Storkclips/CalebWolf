import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase, proxyImageUrl } from '../lib/supabase';
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
      setMagazines(mags);
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
                  ? <img src={proxyImageUrl(magazine.cover_url, 900)} alt={magazine.title} />
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

        {settings?.homepage_widget_enabled && settings?.subscription_enabled && !userHasActiveSub && (
          <section className="magazine-subscribe-card">
            <p className="eyebrow">Stay close to the work</p>
            <h2>{settings.homepage_widget_title}</h2>
            <p>{settings.homepage_widget_copy}</p>
            {subPrice && (
              <p className="magazine-sub-price">{subPrice} / month</p>
            )}
            <button className="btn" type="button" disabled={checkingOut} onClick={startSubscriptionCheckout}>
              Subscribe now
            </button>
          </section>
        )}
      </main>
    </Layout>
  );
}
