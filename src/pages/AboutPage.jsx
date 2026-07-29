import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { usePageSeo } from '../contexts/SeoContext';

const DEFAULT_SECTIONS = [
  {
    id: 'section-hero', type: 'hero', label: 'Hero',
    eyebrow: 'About Caleb',
    headline: 'Filmmaker turned\nphotographer.',
    lead: 'I learned to light for motion pictures before falling in love with stills. That mix of cinematic tone and honest, documentary moments defines my work today.',
    image_url: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'section-blocks', type: 'blocks', label: 'Info Blocks',
    items: [
      { id: 'b1', title: 'Philosophy', body: 'I believe photos should feel lived-in and cinematic. I direct when helpful, then step back and let authentic moments unfold naturally — never forced, always honest.' },
      { id: 'b2', title: 'Approach', body: 'Every project starts with a discovery call to understand your story. From scouting and shot lists to color grading, I handle the details so you can be fully present in the moment.' },
      { id: 'b3', title: 'Location', body: "Based in Portland, traveling often for destination work. I've shot in over 20 states and regularly accept bookings across the Pacific Northwest, Southwest, and East Coast." },
      { id: 'b4', title: 'Equipment', body: 'Sony mirrorless system with cinema-grade prime lenses. Every piece of gear chosen for rendering skin tones and low-light environments the way human eyes experience them.' },
    ],
  },
  {
    id: 'section-personal', type: 'personal', label: 'Personal',
    eyebrow: 'Beyond the camera',
    heading: 'A few things about me',
    items: [
      'Mentors emerging photographers on lighting and workflow.',
      'Collects zines and 35mm film cameras from the 70s and 80s.',
      'Shot documentary short films before switching to photography full-time.',
      'Runs weekend workshops on natural-light portraiture in the Pacific Northwest.',
    ],
    image_main_url: 'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg?auto=compress&cs=tinysrgb&w=600',
    image_accent_url: 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'section-cta', type: 'cta', label: 'CTA Strip',
    heading: 'Ready to work together?',
    subtext: "Let's talk about your project, timeline, and vision.",
  },
];

// ─── section renderers ────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const HeroSection = ({ sec }) => (
  <div className="about-hero">
    <div className="about-hero-inner">
      {sec.eyebrow && <p className="eyebrow">{sec.eyebrow}</p>}
      <h1 style={{ whiteSpace: 'pre-line' }}>{sec.headline}</h1>
      {sec.lead && <p className="lead">{sec.lead}</p>}
    </div>
    {sec.image_url && (
      <div className="about-hero-image">
        <img src={sec.image_url} alt={sec.eyebrow || sec.headline} />
      </div>
    )}
  </div>
);

const BlocksSection = ({ sec }) => (
  <section className="about-section">
    <div className="about-two-col">
      {(sec.items ?? []).map((block) => (
        <div key={block.id} className="about-block">
          <div className="about-block-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h3>{block.title}</h3>
          <p className="muted">{block.body}</p>
        </div>
      ))}
    </div>
  </section>
);

const PersonalSection = ({ sec }) => (
  <section className="about-section about-section--alt">
    <div className="about-personal">
      <div className="about-personal-text">
        {sec.eyebrow && <p className="eyebrow">{sec.eyebrow}</p>}
        {sec.heading && <h2>{sec.heading}</h2>}
        {sec.items?.length > 0 && (
          <ul className="about-list">
            {sec.items.map((item, i) => (
              <li key={i}><CheckIcon />{item}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="about-personal-images">
        {sec.image_main_url && (
          <img className="about-personal-img about-personal-img--main" src={sec.image_main_url} alt="" />
        )}
        {sec.image_accent_url && (
          <img className="about-personal-img about-personal-img--accent" src={sec.image_accent_url} alt="" />
        )}
      </div>
    </div>
  </section>
);

const CtaSection = ({ sec }) => (
  <section className="about-cta">
    {sec.heading && <h2>{sec.heading}</h2>}
    {sec.subtext && <p className="muted">{sec.subtext}</p>}
    <div className="about-cta-actions">
      <a href="/contact" className="btn">Get in touch</a>
      <a href="/collections" className="ghost">View my work</a>
    </div>
  </section>
);

const TextSection = ({ sec }) => (
  <section className="about-section">
    {sec.heading && <h2 style={{ marginBottom: 16 }}>{sec.heading}</h2>}
    {sec.body && <p className="muted" style={{ maxWidth: 680, lineHeight: 1.8 }}>{sec.body}</p>}
  </section>
);

const RENDERERS = {
  hero: HeroSection,
  blocks: BlocksSection,
  personal: PersonalSection,
  cta: CtaSection,
  text: TextSection,
};

// ─── page ─────────────────────────────────────────────────────────────────────

const AboutPage = () => {
  usePageSeo('about', {
    site_title: 'About — Caleb Wolf Photography',
    meta_description: 'Learn the story behind Caleb Wolf — a landscape and wilderness photographer based in the Pacific Northwest. Discover the passion, process, and places behind the work.',
    og_title: 'About Caleb Wolf',
    og_description: 'The story, process, and philosophy behind cinematic wilderness photography by Caleb Wolf.',
  });

  const [sections, setSections] = useState(DEFAULT_SECTIONS);

  useEffect(() => {
    supabase
      .from('about_settings')
      .select('sections')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.sections?.length) setSections(data.sections);
      });
  }, []);

  return (
    <Layout>
      {sections.map((sec) => {
        const Renderer = RENDERERS[sec.type];
        return Renderer ? <Renderer key={sec.id} sec={sec} /> : null;
      })}
    </Layout>
  );
};

export default AboutPage;
