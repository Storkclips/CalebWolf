import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function MagazineBillingPanel() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [subscribers, setSubscribers] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);

  useEffect(() => {
    supabase.from('magazine_settings').select('*').maybeSingle().then(({ data }) => {
      setSettings(data);
      setForm(data ? { ...data } : null);
    });
    setSubsLoading(true);
    supabase
      .from('magazine_subscriptions')
      .select('user_id, status, current_period_end, stripe_subscription_id')
      .then(({ data }) => { setSubscribers(data || []); setSubsLoading(false); });
  }, []);

  if (!form) return null;

  const field = (key) => ({
    value: form[key] ?? '',
    onChange: (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }),
  });

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setNotice('');
    const { error } = await supabase
      .from('magazine_settings')
      .update({
        subscription_enabled: form.subscription_enabled,
        subscription_price_id: form.subscription_price_id?.trim() || null,
        subscription_price_display: form.subscription_price_display,
        subscription_currency: form.subscription_currency,
        subscription_interval: form.subscription_interval,
        trial_days: Number(form.trial_days) || 0,
        promotion_codes_enabled: form.promotion_codes_enabled,
        homepage_widget_enabled: form.homepage_widget_enabled,
        homepage_widget_title: form.homepage_widget_title,
        homepage_widget_copy: form.homepage_widget_copy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);
    setSaving(false);
    setNotice(error ? 'Save failed.' : 'Saved.');
    if (!error) setSettings({ ...settings, ...form });
  }

  const active = subscribers.filter(s => ['active', 'trialing'].includes(s.status)).length;
  const pastDue = subscribers.filter(s => s.status === 'past_due').length;
  const cancelled = subscribers.filter(s => s.status === 'cancelled').length;

  return (
    <div className="magazine-billing-panel">
      <div className="section-head" style={{ marginTop: 40 }}>
        <div>
          <p className="eyebrow">Commerce</p>
          <h3>Subscription billing</h3>
        </div>
      </div>

      <div className="magazine-billing-stats">
        <div className="magazine-billing-stat">
          <span>{active}</span>
          <small>Active subscribers</small>
        </div>
        <div className="magazine-billing-stat">
          <span>{pastDue}</span>
          <small>Past due</small>
        </div>
        <div className="magazine-billing-stat">
          <span>{cancelled}</span>
          <small>Cancelled</small>
        </div>
      </div>

      <form className="magazine-billing-form ap-form" onSubmit={save}>
        <label className="ap-label ap-label--inline">
          <input type="checkbox" checked={!!form.subscription_enabled} onChange={field('subscription_enabled').onChange} />
          Enable subscription offering
        </label>

        <label className="ap-label">
          Stripe Price ID (recurring)
          <input className="ap-input" type="text" placeholder="price_xxxxxxxxxxxxxxxxxx" {...field('subscription_price_id')} />
          <span className="ap-hint muted small">Create this price in the Stripe Dashboard. Changing this creates a new price for new subscribers only.</span>
        </label>

        <label className="ap-label">
          Display price (e.g. 9.99)
          <input className="ap-input" type="number" min="0" step="0.01" {...field('subscription_price_display')} />
        </label>

        <label className="ap-label">
          Currency
          <input className="ap-input" type="text" placeholder="usd" {...field('subscription_currency')} />
        </label>

        <label className="ap-label">
          Trial days (0 = no trial)
          <input className="ap-input" type="number" min="0" {...field('trial_days')} />
        </label>

        <label className="ap-label ap-label--inline">
          <input type="checkbox" checked={!!form.promotion_codes_enabled} onChange={field('promotion_codes_enabled').onChange} />
          Allow promotion codes at checkout
        </label>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

        <label className="ap-label ap-label--inline">
          <input type="checkbox" checked={!!form.homepage_widget_enabled} onChange={field('homepage_widget_enabled').onChange} />
          Show subscription widget on homepage
        </label>

        <label className="ap-label">
          Widget headline
          <input className="ap-input" type="text" {...field('homepage_widget_title')} />
        </label>

        <label className="ap-label">
          Widget copy
          <textarea className="ap-textarea" rows={3} {...field('homepage_widget_copy')} />
        </label>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {notice && <span className="muted small">{notice}</span>}
        </div>
      </form>
    </div>
  );
}
