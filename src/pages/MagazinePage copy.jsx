import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MagazineViewer from '../components/magazines/MagazineViewer';
import {
  buildPageList,
  fetchMagazineManifest,
} from '../components/magazines/magazineUtils';
import '../styles/magazines.css';

export default function MagazinePage() {
  const { slug = '' } = useParams();
  const [manifest, setManifest] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');
      setManifest(null);
      setPages([]);

      try {
        const nextManifest = await fetchMagazineManifest(slug, controller.signal);
        const nextPages = buildPageList(slug, nextManifest);
        if (!nextPages.length) {
          throw new Error('This magazine manifest does not define any pages.');
        }
        setManifest(nextManifest);
        setPages(nextPages);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || 'Could not open magazine.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return <main className="magazine-detail-state">Loading magazine…</main>;
  }

  if (error || !manifest) {
    return (
      <main className="magazine-detail-state magazine-detail-state--error">
        <h1>Magazine unavailable</h1>
        <p>{error}</p>
        <Link to="/magazines">← Back to magazines</Link>
      </main>
    );
  }

  return (
    <main className="magazine-detail-page">
      <div className="magazine-detail-topline">
        <Link to="/magazines">← All magazines</Link>
        <div>
          <h1>{manifest.title || slug}</h1>
          {manifest.issue ? <span>{manifest.issue}</span> : null}
        </div>
      </div>

      <MagazineViewer manifest={manifest} pages={pages} slug={slug} />
    </main>
  );
}
