import { proxyImageUrl, inlineCss } from '../../lib/magazines';

/**
 * Read-only renderer for a single magazine page.
 * Renders the same element format used by the Magazine Studio:
 *   - text (plain or HTML)
 *   - images (via proxyImageUrl)
 *   - shapes (fill + radius)
 *   - canvas (Fabric.js thumbnail from the iframe Studio)
 *
 * Coordinates are percentage-based, matching the Studio layout system.
 * Font sizes use container-query units (fontSize/10 cqw) so scaling
 * matches the editor exactly.
 */
export default function MagazinePageRenderer({ page }) {
  if (!page) return null;

  const bg = page.background_color || '#ffffff';
  const elements = page.elements || [];

  return (
    <div className="reader-page-art" style={{ background: bg }}>
      {elements.map((element) => {
        if (element.type === 'canvas') {
          return (
            <div
              key={element.id}
              className="magazine-element magazine-element--canvas"
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.w}%`,
                height: `${element.h}%`,
                zIndex: element.zIndex || 1,
              }}
            >
              {element.src ? (
                <img
                  src={element.src}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>
          );
        }

        return (
          <div
            key={element.id}
            className={`magazine-element magazine-element--${element.type}`}
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              width: `${element.w}%`,
              height: `${element.h}%`,
              color: element.color,
              background: element.type === 'shape' ? element.fill : undefined,
              fontFamily: element.fontFamily,
              fontSize: element.fontSize ? `${element.fontSize / 10}cqw` : undefined,
              fontWeight: element.weight,
              textAlign: element.align,
              borderRadius: element.radius ? `${element.radius / 10}cqw` : 0,
              zIndex: element.zIndex || 1,
              ...inlineCss(element.css),
            }}
          >
            {element.type === 'image' && element.src
              ? <img src={proxyImageUrl(element.src, 1400)} alt={element.alt || ''} style={{ objectFit: element.fit || 'cover' }} />
              : element.type === 'text'
                ? (element.html
                    ? <span dangerouslySetInnerHTML={{ __html: element.html }} />
                    : element.text)
                : null}
          </div>
        );
      })}
    </div>
  );
}
