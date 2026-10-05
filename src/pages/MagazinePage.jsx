import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase, proxyImageUrl } from '../lib/supabase';
import { fetchMagazineBySlug, resolveAccess, getCoverSource } from '../lib/magazines';
import MagazineFlipbook from '../components/magazines/MagazineFlipbook';
import { useAuth } from '../store/AuthContext';

export default function MagazinePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [magazine, setMagazine] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [access, setAccess] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setMagazine(null);
      setPages([]);
      setPageIndex(0);
      setAccess(null);
      setError('');
      setLoading(true);

      try {
        const [magData, settingsRes] = await Promise.all([
          fetchMagazineBySlug(slug, { includeDrafts: profile?.is_admin }),
          supabase.from('magazine_settings').select('*').maybeSingle(),
        ]);

        if (cancelled) return;

        setSettings(settingsRes.data);

        if (magData.status !== 'published' && !profile?.is_admin) {
          setError('Magazine unavailable.');
          setLoading(false);
          return;
        }

        setMagazine(magData);

        const resolved = await resolveAccess(
          user?.id ?? null,
          profile?.is_admin ?? false,
          magData.id,
          magData.digital_price,
        );

        if (cancelled) return;

        setAccess(resolved);
        setPages(resolved.granted ? magData.pages : []);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load magazine:', slug, err);
        setError(err.message || 'Magazine not found.');
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
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
    } catch { /* stay on page */ }
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
    } catch { /* stay on page */ }
    setCheckingOut(false);
  }

  const isCover = pageIndex === 0;
  const leftPage = pages[pageIndex];
  const rightPage = !isCover ? pages[pageIndex + 1] : null;
  const canNext = isCover ? pages.length > 1 : pageIndex + 2 < pages.length;
  const subPrice = settings?.subscription_price_display
    ? `${Number(settings.subscription_price_display).toFixed(2)}`
    : null;
  const coverSrc = getCoverSource(magazine);

  // Studio-saved magazines store their artwork inside canvas elements; the
  // flipbook renders those at high resolution. Only fall back to the old
  // spread renderer when no page carries canvas artwork.
  const hasCanvasArtwork = pages.some(
    (p) => p.elements?.some((e) => e.type === 'canvas'),
  );

  if (loading) {
    return (
      <Layout>
        <main className="magazine-public-page">
          <div className="magazine-reader-state">Loading magazine…</div>
        </main>
      </Layout>
    );
  }

  if (error || !magazine) {
    return (
      <Layout>
        <main className="magazine-public-page">
          <div className="magazine-reader-state">
            <h1>{error || 'Magazine not found.'}</h1>
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
          pages.length === 0 ? (
            <div className="magazine-reader-state">This magazine does not have any pages yet.</div>
          ) : hasCanvasArtwork ? (
            <MagazineFlipbook pages={pages} title={magazine.title} />
          ) : (
            <section className="magazine-reader">
              <div className={`magazine-spread${isCover ? ' magazine-spread--cover' : ''}`}>
                {leftPage && <MagazinePageRenderer page={leftPage} />}
                {rightPage && <MagazinePageRenderer page={rightPage} />}
              </div>
              <div className="magazine-reader-controls">
                <button
                  className="icon-button"
                  type="button"
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((c) => Math.max(0, c === 1 ? 0 : c - 2))}
                >
                  ←
                </button>
                <span>
                  {isCover ? 'Cover' : `${leftPage?.page_number || ''}–${rightPage?.page_number || ''}`}
                  {' / '}{pages.length}
                </span>
                <button
                  className="icon-button"
                  type="button"
                  disabled={!canNext}
                  onClick={() => setPageIndex((c) => isCover ? 1 : c + 2)}
                >
                  →
                </button>
              </div>
            </section>
          )
        ) : (
          <section className="magazine-access-card">
            {coverSrc && (
              <img
                className="magazine-access-cover"
                src={proxyImageUrl(coverSrc, 600)}
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
                    Subscribe — {subPrice}/month
                  </button>
                )}
                <button
                  className="btn btn--outline"
                  type="button"
                  disabled={checkingOut}
                  onClick={startIssueCheckout}
                >
                  Buy this issue{subPrice ? ` — ${subPrice}` : ''}
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
