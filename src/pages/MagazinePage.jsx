import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase, proxyImageUrl } from '../lib/supabase';
import { fetchMagazineBySlug, resolveAccess, getCoverSource, getCoverDisplayUrl } from '../lib/magazines';
import { useAuth } from '../store/AuthContext';
import MagazineFlipbookReader from '../components/magazines/MagazineFlipbookReader';
import '../styles/magazines.css';

export default function MagazinePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [magazine, setMagazine] = useState(null);
  const [pages, setPages] = useState([]);
  const [access, setAccess] = useState(null);
  const [readerPageImages, setReaderPageImages] = useState({});
  const [readerOpen, setReaderOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setMagazine(null);
      setPages([]);
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

  // Pre-cut page images written by the publish pipeline. Each index is one
  // reader page: front cover, inside front, inners, inside back, back cover.
  useEffect(() => {
    let cancelled = false;
    setReaderPageImages({});
    if (!magazine?.id) return undefined;
    supabase
      .from('magazine_reader_pages')
      .select('page_index, image')
      .eq('magazine_id', magazine.id)
      .order('page_index')
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data)) return;
        const map = {};
        data.forEach((row) => { map[row.page_index] = row.image; });
        setReaderPageImages(map);
      });
    return () => { cancelled = true; };
  }, [magazine?.id]);

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

  const storedIndexes = Object.keys(readerPageImages).map(Number).sort((a, b) => a - b);
  const imageList = storedIndexes.length
    ? storedIndexes.map((i) => readerPageImages[i])
    : pages.map((p) => p.elements?.find((e) => e.type === 'canvas')?.src || '');

  const subPrice = settings?.subscription_price_display
    ? `${Number(settings.subscription_price_display).toFixed(2)}`
    : null;
  // The thumbnail is the first page of the cover; fall back to the stored
  // cover field when no page images exist yet.
  const coverSrc = imageList[0] || getCoverSource(magazine);

  useEffect(() => {
    if (!readerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [readerOpen]);

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
          imageList.length === 0 ? (
            <div className="magazine-reader-state">This magazine does not have any pages yet.</div>
          ) : (
            <section className="magazine-reader-open">
              <img className="magazine-reader-poster" src={coverSrc.startsWith('data:') || coverSrc.startsWith('blob:') ? coverSrc : proxyImageUrl(coverSrc, 900)} alt={magazine.title} />
              <div className="magazine-reader-open-body">
                <p className="eyebrow">Digital edition</p>
                <h2>{magazine.title}</h2>
                <p>{magazine.description}</p>
                <button className="btn" type="button" onClick={() => setReaderOpen(true)}>
                  Open reader
                </button>
              </div>
            </section>
          )
        ) : (
          <section className="magazine-access-card">
            {coverSrc && (
              <img
                className="magazine-access-cover"
                src={getCoverDisplayUrl(coverSrc, 600)}
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

        {readerOpen && (
          <MagazineFlipbookReader
            pages={imageList}
            title={magazine.title}
            onClose={() => setReaderOpen(false)}
          />
        )}
      </main>
    </Layout>
  );
}
