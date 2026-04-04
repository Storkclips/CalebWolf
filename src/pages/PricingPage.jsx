import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const PricingPage = () => {
  const [sessionPricing, setSessionPricing] = useState([]);
  const [printSizes, setPrintSizes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: sessions }, { data: prints }] = await Promise.all([
        supabase.from('session_pricing').select('*').eq('active', true).order('category').order('sort_order'),
        supabase.from('print_sizes').select('*').eq('active', true).order('category').order('sort_order'),
      ]);
      setSessionPricing(sessions || []);
      setPrintSizes(prints || []);
      setLoading(false);
    };
    load();
  }, []);

  const sessionCategories = [...new Set(sessionPricing.map((s) => s.category))];
  const printCategories = [...new Set(printSizes.map((p) => p.category))];

  return (
    <Layout>
      <div className="pricing-page">

        <div className="pricing-page-hero">
          <p className="pricing-page-eyebrow">Sessions &amp; Prints</p>
          <h1 className="pricing-page-title">Pricing</h1>
          <p className="pricing-page-sub">
            All sessions include edited digital files. Contact us to book or negotiate a custom package.
          </p>
        </div>

        {loading ? (
          <div className="pricing-loading">Loading pricing...</div>
        ) : (
          <div className="pricing-boards-wrap">

            {sessionCategories.map((cat) => {
              const items = sessionPricing.filter((s) => s.category === cat);
              const footnote = items.find((s) => s.notes)?.notes || '';
              return (
                <div key={cat} className="menu-board">
                  <div className="menu-board-inner">
                    <div className="menu-board-logo">
                      <span className="menu-board-brand">CALEB</span>
                      <span className="menu-board-brand-sub">Photography</span>
                    </div>
                    <div className="menu-board-category">{cat}</div>
                    <div className="menu-board-items">
                      {items.map((item) => (
                        <div key={item.id} className="menu-board-row">
                          <span className="menu-board-label">{item.label}</span>
                          <span className="menu-board-dots" aria-hidden="true" />
                          <span className="menu-board-price">{item.price_display}</span>
                        </div>
                      ))}
                    </div>
                    {footnote && (
                      <p className="menu-board-footnote">{footnote}</p>
                    )}
                    <div className="menu-board-contact">
                      <span className="menu-board-phone">(971) 208-5717</span>
                      <span className="menu-board-website">www.calebwolfphotography.com</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {printCategories.length > 0 && (
              <div className="menu-board menu-board-prints">
                <div className="menu-board-inner">
                  <div className="menu-board-logo">
                    <span className="menu-board-brand">CALEB</span>
                    <span className="menu-board-brand-sub">Photography</span>
                  </div>
                  <div className="menu-board-category">Prints</div>
                  {printCategories.map((cat) => {
                    const items = printSizes.filter((p) => p.category === cat);
                    const base = items[0];
                    return (
                      <div key={cat} className="menu-board-print-group">
                        <div className="menu-board-print-heading">{cat}</div>
                        {base && (
                          <div className="menu-board-print-base-price">
                            <span className="menu-board-print-dollar">$</span>
                            <span className="menu-board-print-amount">
                              {parseFloat(base.base_price).toFixed(2).replace('.00', '')}
                            </span>
                          </div>
                        )}
                        <div className="menu-board-print-sizes">
                          {items.map((item) => (
                            <div key={item.id} className="menu-board-print-size-row">
                              <span className="menu-board-print-size-label">{item.label}</span>
                              {item.additional_price > 0 && (
                                <span className="menu-board-print-add">
                                  +${parseFloat(item.additional_price).toFixed(2)} additional
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div className="menu-board-contact">
                    <span className="menu-board-phone">(971) 208-5717</span>
                    <span className="menu-board-website">www.calebwolfphotography.com</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pricing-cta-row">
          <div className="pricing-cta-card">
            <h2 className="pricing-cta-title">Ready to book?</h2>
            <p className="pricing-cta-body">
              All prices may be negotiated depending on travel and other factors. Reach out and we'll build the right package for you.
            </p>
            <div className="pricing-cta-actions">
              <Link to="/contact" className="pricing-cta-btn-primary">Get in touch</Link>
              <Link to="/collections" className="pricing-cta-btn-ghost">Browse work</Link>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default PricingPage;
