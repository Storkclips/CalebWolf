import { Link } from 'react-router-dom';

export default function MagazineCard({ magazine }) {
  const { slug, title, description, cover, pageCount, issue } = magazine;

  return (
    <article className="magazine-card">
      <Link className="magazine-card__cover-link" to={`/magazines/${encodeURIComponent(slug)}`}>
        <div className="magazine-card__cover">
          {cover ? (
            <img src={cover} alt={`${title} cover`} loading="lazy" />
          ) : (
            <div className="magazine-card__placeholder">No cover</div>
          )}
          <div className="magazine-card__shine" aria-hidden="true" />
        </div>
      </Link>

      <div className="magazine-card__body">
        {issue ? <div className="magazine-card__eyebrow">{issue}</div> : null}
        <h2>
          <Link to={`/magazines/${encodeURIComponent(slug)}`}>{title}</Link>
        </h2>
        {description ? <p>{description}</p> : null}
        <div className="magazine-card__meta">
          <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
          <Link to={`/magazines/${encodeURIComponent(slug)}`}>Read magazine →</Link>
        </div>
      </div>
    </article>
  );
}
