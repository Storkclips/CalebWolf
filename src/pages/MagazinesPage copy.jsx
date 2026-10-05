import { useEffect, useMemo, useState } from 'react';
import MagazineCard from '../components/magazines/MagazineCard';
import {
  buildPageList,
  fetchMagazineIndex,
  fetchMagazineManifest,
  getCoverSource,
} from '../components/magazines/magazineUtils';
import '../styles/magazines.css';

export default function MagazinesPage() {
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');

      try {
        const entries = await fetchMagazineIndex(controller.signal);
        const results = await Promise.allSettled(
          entries.map(async (entry) => {
            const manifest = await fetchMagazineManifest(entry.slug, controller.signal);
            const pages = buildPageList(entry.slug, manifest);
            return {
              ...entry,
              ...manifest,
              slug: entry.slug,
              title: manifest.title || entry.title || entry.slug,
              description: manifest.description || entry.description || '',
              issue: manifest.issue || entry.issue || '',
              pages,
              pageCount: pages.length,
              cover: getCoverSource(entry.slug, manifest, pages),
            };
          }),
        );

        const loaded = results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value);

        const failed = results.filter((result) => result.status === 'rejected');
        if (!loaded.length && failed.length) {
          throw failed[0].reason;
        }

        setMagazines(loaded);
        if (failed.length) {
          console.warn('Some magazine manifests could not be loaded:', failed);
        }
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || 'Could not load magazines.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return magazines;
    return magazines.filter((magazine) =>
      [magazine.title, magazine.description, magazine.issue, magazine.slug]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [magazines, query]);

  return (
    <main className="magazines-library-page">
      <section className="magazines-library-hero">
        <div>
          <div className="magazines-library-kicker">Digital publications</div>
          <h1>Magazines</h1>
          <p>Browse every magazine currently published in the site library.</p>
        </div>

        <label className="magazines-library-search">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search magazines…"
          />
        </label>
      </section>

      {loading ? <div className="magazines-state">Loading magazines…</div> : null}

      {error ? (
        <div className="magazines-state magazines-state--error">
          <strong>Magazine library could not be loaded.</strong>
          <span>{error}</span>
          <code>/public/magazines/index.json</code>
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="magazines-state">No magazines found.</div>
      ) : null}

      <section className="magazines-grid" aria-live="polite">
        {filtered.map((magazine) => (
          <MagazineCard key={magazine.slug} magazine={magazine} />
        ))}
      </section>
    </main>
  );
}
