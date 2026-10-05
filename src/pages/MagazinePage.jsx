import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase, proxyImageUrl } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';

const inlineCss = (value = '') => value.split(';').reduce((styles, declaration) => {
  const [property, ...parts] = declaration.split(':');
  if (!property || !parts.length) return styles;
  const key = property.trim().replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return { ...styles, [key]: parts.join(':').trim() };
}, {});

function PageArtwork({ page }) {
  return (
    <div className="reader-page-art" style={{ background: page.background_color }}>
      {page.elements?.map((element) => (
        <div
          key={element.id}
          className={`magazine-element magazine-element--${element.type}`}
          style={{
            left: `${element.x}%`, top: `${element.y}%`,
            width: `${element.w}%`, height: `${element.h}%`,
            color: element.color,
            background: element.type === 'shape' ? element.fill : undefined,
            fontFamily: element.fontFamily,
            fontSize: `${element.fontSize / 10}cqw`,
            fontWeight: element.weight,
            textAlign: element.align,
            borderRadius: element.radius ? `${element.radius / 10}cqw` : 0,
            zIndex: element.zIndex || 1,
            ...inlineCss(element.css),
          }}
        >
          {element.type === 'image' && element.src
            ? <img src={proxyImageUrl(element.src, 1400)} alt={element.alt || ''} style={{ objectFit: element.fit }} />
            : element.type === 'text'
              ? (element.html ? <span dangerouslySetInnerHTML={{ __html: element.html }} /> : element.text)
              : null}
        </div>
      ))}
    </div>
  );
}

async function resolveAccess(userId, isAdmin, magazineId, digitalPrice) {
  if (isAdmin) return { granted: true, reason: 'admin' };
  if (!digitalPrice || digitalPrice === 0) return { granted: true, reason: 'free' };
  if (!userId) return { granted: false, reason: 'unauthenticated' };

  const [entitlementRes, subscriptionRes] = await Promise.all([
    supabase
      .from('magazine_entitlements')
      .select('id')
      .eq('user_id', userId)
      .eq('magazine_id', magazineId)
      .is('revoked_at', null)
      .maybeSingle(),
    supabase
      .from('magazine_subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle(),
  ]);

  if (entitlementRes.data) return { granted: true, reason: 'entitlement' };

  const sub = subscriptionRes.data;
  if (sub) {
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
    if (!periodEnd || periodEnd > new Date()) return { granted: true, reason: 'subscription' };
  }

  return { granted: false, reason: 'locked' };
}

export default function MagazinePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [magazine, setMagazine] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [access, setAccess] = useState(null); // null = resolving
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [magRes, settingsRes] = await Promise.all([
        supabase.from('magazines').select('*').eq('slug', slug).eq('status', 'published').maybeSingle(),
        supabase.from('magazine_settings').select('*').maybeSingle(),
      ]);

      const item = magRes.data;
      setSettings(settingsRes.data);
      if (!item) { setLoading(false); return; }
      setMagazine(item);

      const resolved = await resolveAccess(
        user?.id ?? null,
        profile?.is_admin ?? false,
        item.id,
        item.digital_price,
      );
      setAccess(resolved);

      if (resolved.granted) {
        const { data: artwork } = await supabase
          .from('magazine_pages')
          .select('*')
          .eq('magazine_id', item.id)
          .order('page_number');
        setPages(artwork || []);
      }
      setLoading(false);
    }
    load();
  }, [slug, user?.id, profile?.is_admin]);

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
            success_url: `${window.location.origin}/magazines/${slug}`,
            cancel_url: window.location.href,
          }),
        },
      );
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch {
      // silently handle — user stays on page
    }
    setCheckingOut(false);
  }

  async function startIssueCheckout() {
    if (!user) { navigate('/login'); return; }
    setCheckingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/magazine-issue-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            magazine_id: magazine.id,
            success_url: `${window.location.origin}/magazines/${slug}`,
            cancel_url: window.location.href,
          }),
        },
      );
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch {
      // silently handle
    }
    setCheckingOut(false);
  }

  const isCover = pageIndex === 0;
  const leftPage = pages[pageIndex];
  const rightPage = !isCover ? pages[pageIndex + 1] : null;
  const canNext = isCover ? pages.length > 1 : pageIndex + 2 < pages.length;
  const subPrice = settings?.subscription_price_display
    ? `$${Number(settings.subscription_price_display).toFixed(2)}`
    : null;

  if (loading) {
    return (
      <Layout>
        <main className="magazine-public-page">
          <div className="magazine-reader-state">Loading magazine\u2026</div>
        </main>
      </Layout>
    );
  }

  if (!magazine) {
    return (
      <Layout>
        <main className="magazine-public-page">
          <div className="magazine-reader-state">
            <h1>Magazine unavailable</h1>
            <Link className="btn" to="/magazines">Back to magazines</Link>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="magazine-public-page">
        <header className="magazine-public-header">
          <div>
            <p className="eyebrow">Digital edition</p>
            <h1>{magazine.title}</h1>
            <p>{magazine.description}</p>
          </div>
          <Link className="ghost" to="/magazines">All magazines</Link>
        </header>

        {access?.granted ? (
          <section className="magazine-reader">
            <div className={`magazine-spread${isCover ? ' magazine-spread--cover' : ''}`}>
              {leftPage && <PageArtwork page={leftPage} />}
              {rightPage && <PageArtwork page={rightPage} />}
            </div>
            <div className="magazine-reader-controls">
              <button
                className="icon-button"
                type="button"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((c) => Math.max(0, c === 1 ? 0 : c - 2))}
              >
                \u2190
              </button>
              <span>
                {isCover ? 'Cover' : `${leftPage?.page_number || ''}\u2013${rightPage?.page_number || ''}`}
                {' / '}{pages.length}
              </span>
              <button
                className="icon-button"
                type="button"
                disabled={!canNext}
                onClick={() => setPageIndex((c) => isCover ? 1 : c + 2)}
              >
                \u2192
              </button>
            </div>
          </section>
        ) : (
          <section className="magazine-access-card">
            {magazine.cover_url && (
              <img
                className="magazine-access-cover"
                src={proxyImageUrl(magazine.cover_url, 600)}
                alt={magazine.title}
              />
            )}
            <div className="magazine-access-body">
              <p className="eyebrow">Private edition</p>
              <h2>Unlock this magazine</h2>
              <p>
                Purchase this issue once and own it permanently, or subscribe to access the full
                library while your subscription is active.
              </p>
              <div className="magazine-access-actions">
                {settings?.subscription_enabled && subPrice && (
                  <button
                    className="btn"
                    type="button"
                    disabled={checkingOut}
                    onClick={startSubscriptionCheckout}
                  >
                    Subscribe \u2014 {subPrice}/month
                  </button>
                )}
                <button
                  className="btn btn--outline"
                  type="button"
                  disabled={checkingOut}
                  onClick={startIssueCheckout}
                >
                  Buy this issue{subPrice ? ` \u2014 ${subPrice}` : ''}
                </button>
                {!user && (
                  <Link className="ghost" to={`/login?next=/magazines/${slug}`}>
                    Sign in to your account
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}
