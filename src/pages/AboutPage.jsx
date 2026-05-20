import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const DEFAULTS = {
  hero_eyebrow: 'About Caleb',
  hero_headline: 'Filmmaker turned photographer.',
  hero_lead: 'I learned to light for motion pictures before falling in love with stills. That mix of cinematic tone and honest, documentary moments defines my work today.',
  hero_image_url: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=800',
  block_philosophy_title: 'Philosophy',
  block_philosophy_body: 'I believe photos should feel lived-in and cinematic. I direct when helpful, then step back and let authentic moments unfold naturally — never forced, always honest.',
  block_approach_title: 'Approach',
  block_approach_body: 'Every project starts with a discovery call to understand your story. From scouting and shot lists to color grading, I handle the details so you can be fully present in the moment.',
  block_location_title: 'Location',
  block_location_body: "Based in Portland, traveling often for destination work. I've shot in over 20 states and regularly accept bookings across the Pacific Northwest, Southwest, and East Coast.",
  block_equipment_title: 'Equipment',
  block_equipment_body: 'Sony mirrorless system with cinema-grade prime lenses. Every piece of gear chosen for rendering skin tones and low-light environments the way human eyes experience them.',
  personal_eyebrow: 'Beyond the camera',
  personal_heading: 'A few things about me',
  personal_items: [
    'Mentors emerging photographers on lighting and workflow.',
    'Collects zines and 35mm film cameras from the 70s and 80s.',
    'Shot documentary short films before switching to photography full-time.',
    'Runs weekend workshops on natural-light portraiture in the Pacific Northwest.',
  ],
  personal_image_main_url: 'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg?auto=compress&cs=tinysrgb&w=600',
  personal_image_accent_url: 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=400',
  cta_heading: 'Ready to work together?',
  cta_subtext: "Let's talk about your project, timeline, and vision.",
};

const BLOCK_ICONS = {
  block_philosophy: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
    </svg>
  ),
  block_approach: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" />
      <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
      <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z" />
      <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z" />
      <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z" />
      <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
      <path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z" />
      <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z" />
    </svg>
  ),
  block_location: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  block_equipment: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
};

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AboutPage = () => {
  const [d, setD] = useState(DEFAULTS);

  useEffect(() => {
    supabase
      .from('about_settings')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setD({ ...DEFAULTS, ...data });
      });
  }, []);

  const blocks = [
    { key: 'block_philosophy', title: d.block_philosophy_title, body: d.block_philosophy_body },
    { key: 'block_approach',   title: d.block_approach_title,   body: d.block_approach_body   },
    { key: 'block_location',   title: d.block_location_title,   body: d.block_location_body   },
    { key: 'block_equipment',  title: d.block_equipment_title,  body: d.block_equipment_body  },
  ];

  return (
    <Layout>
      {/* Hero */}
      <div className="about-hero">
        <div className="about-hero-inner">
          <p className="eyebrow">{d.hero_eyebrow}</p>
          <h1>{d.hero_headline}</h1>
          <p className="lead">{d.hero_lead}</p>
        </div>
        {d.hero_image_url && (
          <div className="about-hero-image">
            <img src={d.hero_image_url} alt={d.hero_eyebrow} />
          </div>
        )}
      </div>

      {/* Info blocks */}
      <section className="about-section">
        <div className="about-two-col">
          {blocks.map(({ key, title, body }) => (
            <div key={key} className="about-block">
              <div className="about-block-icon">{BLOCK_ICONS[key]}</div>
              <h3>{title}</h3>
              <p className="muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Personal */}
      <section className="about-section about-section--alt">
        <div className="about-personal">
          <div className="about-personal-text">
            <p className="eyebrow">{d.personal_eyebrow}</p>
            <h2>{d.personal_heading}</h2>
            {d.personal_items?.length > 0 && (
              <ul className="about-list">
                {d.personal_items.map((item, i) => (
                  <li key={i}>
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="about-personal-images">
            {d.personal_image_main_url && (
              <img
                className="about-personal-img about-personal-img--main"
                src={d.personal_image_main_url}
                alt={d.personal_heading}
              />
            )}
            {d.personal_image_accent_url && (
              <img
                className="about-personal-img about-personal-img--accent"
                src={d.personal_image_accent_url}
                alt="accent"
              />
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <h2>{d.cta_heading}</h2>
        <p className="muted">{d.cta_subtext}</p>
        <div className="about-cta-actions">
          <a href="/contact" className="btn">Get in touch</a>
          <a href="/collections" className="ghost">View my work</a>
        </div>
      </section>
    </Layout>
  );
};

export default AboutPage;
