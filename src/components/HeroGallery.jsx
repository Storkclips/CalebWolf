import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const heroSlides = [
  {
    image:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80',
    eyebrow: 'Editorial & Documentary',
    title: 'Full-day wedding narratives in cinematic light.',
    description:
      'Guided portraits and documentary candids woven together so your gallery feels effortless and alive.',
  },
  {
    images: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80',
    ],
    eyebrow: 'Portraits',
    title: 'Editorial portraits with gentle direction.',
    description:
      'From creative studio setups to windswept coastlines, every session is designed to feel like you.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
    eyebrow: 'Destination',
    title: 'Travel-ready storytelling for intimate celebrations.',
    description:
      'Permits, scouting, and timelines handled so you can simply be present while we create artful coverage.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=1600&q=80',
    eyebrow: 'Brand Stories',
    title: 'Launch visuals with intentional art direction.',
    description:
      'Cohesive imagery for founders and teams, from lifestyle to product, delivered with social-ready crops.',
  },
];

const HeroGallery = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const slideCount = heroSlides.length;
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPaused) return undefined;

    intervalRef.current = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, 5000);

    return () => clearTimeout(intervalRef.current);
  }, [activeIndex, isPaused, slideCount]);

  const handleManualChange = (index) => {
    setIsPaused(true);
    setActiveIndex((index + slideCount) % slideCount);
  };

  const toggleToolbar = () => setIsToolbarVisible((prev) => !prev);
  const handleToolbarFocus = () => setIsToolbarVisible(true);

  const activeSlide = heroSlides[activeIndex];
  const heroImage = activeSlide.image ?? activeSlide.images?.[0];
  const isPortraitSet = activeSlide.images && activeSlide.images.length > 1;

  return (
    <section className="hero-gallery" aria-label="Featured photography gallery">
      <div className="hero-inner">
        <div className="hero-frame">
          <button
            type="button"
            className="gear-toggle"
            onClick={toggleToolbar}
            onFocus={handleToolbarFocus}
            aria-pressed={isToolbarVisible}
            aria-label="Show slideshow controls"
          >
            ⚙️
          </button>
          <div className="hero-visual">
            {isPortraitSet ? (
              <div className="hero-mosaic">
                {activeSlide.images.map((image, index) => (
                  <img
                    key={image}
                    className="hero-image portrait"
                    src={image}
                    alt={`${activeSlide.title} ${index + 1}`}
                  />
                ))}
              </div>
            ) : (
              <img className="hero-image" src={heroImage} alt={activeSlide.title} />
            )}
          </div>
          <div className="hero-copy hero-copy-overlay">
            <div className="hero-actions subtle">
              <Link className="btn" to="/collections">
                View collections
              </Link>
              <Link className="ghost" to="/contact">
                Start an inquiry
              </Link>
            </div>
          </div>
          <div className={`hero-toolbar ${isToolbarVisible ? 'visible' : ''}`}>
            <button
              className="icon-button"
              type="button"
              onClick={() => handleManualChange(activeIndex - 1)}
              aria-label="Previous slide"
            >
              ←
            </button>
            <div className="hero-dots" role="tablist" aria-label="Slide selector">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  className={`dot ${index === activeIndex ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleManualChange(index)}
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => handleManualChange(activeIndex + 1)}
              aria-label="Next slide"
            >
              →
            </button>
            <div className="hero-toolbar-actions">
              <button
                className="pill control-pill"
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                aria-pressed={isPaused}
              >
                {isPaused ? 'Resume' : 'Pause'} auto-play
              </button>
              <button
                className="pill control-pill"
                type="button"
                onClick={() => {
                  setIsPaused(true);
                  setIsLightboxOpen(true);
                }}
                aria-label="Open full-screen view"
              >
                Magnify
              </button>
            </div>
          </div>
        </div>
      </div>
      {isLightboxOpen && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={activeSlide.title}>
          <button
            className="icon-button close"
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            ✕
          </button>
          <div
            className="lightbox-frame"
            style={{ backgroundImage: `url(${heroImage})` }}
            role="img"
            aria-label={activeSlide.title}
          />
          <div className="lightbox-meta">
            <div>
              <p className="eyebrow">{activeSlide.eyebrow}</p>
              <h2>{activeSlide.title}</h2>
              <p className="muted">{activeSlide.description}</p>
            </div>
            <div className="lightbox-controls">
              <button
                className="icon-button"
                type="button"
                onClick={() => handleManualChange(activeIndex - 1)}
                aria-label="Previous slide"
              >
                ←
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => handleManualChange(activeIndex + 1)}
                aria-label="Next slide"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroGallery;
