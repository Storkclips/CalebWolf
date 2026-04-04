import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const EMPTY_PKG = {
  name: '',
  description: '',
  credits: 0,
  bonus_credits: 0,
  price_cents: 0,
  stripe_price_id: '',
  stripe_product_id: '',
  is_featured: false,
  sale_active: false,
  sale_price_cents: 0,
  sale_label: '',
  active: true,
  sort_order: 0,
};

const fmt = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const PkgForm = ({ item, setItem, onSave, onCancel, saveLabel, saving }) => (
  <div className="ap-edit-card">
    <div className="ap-edit-grid">
      <label className="ap-label">
        Package name
        <input className="ap-input" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="e.g. Starter Pack" />
      </label>
      <label className="ap-label">
        Credits awarded
        <input className="ap-input" type="number" min="1" value={item.credits} onChange={(e) => setItem({ ...item, credits: parseInt(e.target.value) || 0 })} />
      </label>
      <label className="ap-label">
        Bonus credits
        <input className="ap-input" type="number" min="0" value={item.bonus_credits} onChange={(e) => setItem({ ...item, bonus_credits: parseInt(e.target.value) || 0 })} placeholder="0 = no bonus" />
      </label>
      <label className="ap-label">
        Price (cents) — e.g. 1000 = $10.00
        <input className="ap-input" type="number" min="0" value={item.price_cents} onChange={(e) => setItem({ ...item, price_cents: parseInt(e.target.value) || 0 })} />
      </label>
      <label className="ap-label">
        Stripe Price ID
        <input className="ap-input" value={item.stripe_price_id} onChange={(e) => setItem({ ...item, stripe_price_id: e.target.value })} placeholder="price_..." />
      </label>
      <label className="ap-label">
        Stripe Product ID
        <input className="ap-input" value={item.stripe_product_id} onChange={(e) => setItem({ ...item, stripe_product_id: e.target.value })} placeholder="prod_..." />
      </label>
      <label className="ap-label">
        Sort order
        <input className="ap-input" type="number" value={item.sort_order} onChange={(e) => setItem({ ...item, sort_order: parseInt(e.target.value) || 0 })} />
      </label>
      <label className="ap-label">
        Description
        <input className="ap-input" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} placeholder="Short tagline for buyers" />
      </label>
    </div>

    <div className="credits-admin-divider">Sale settings</div>
    <div className="ap-edit-grid">
      <label className="ap-label">
        Sale price (cents)
        <input className="ap-input" type="number" min="0" value={item.sale_price_cents} onChange={(e) => setItem({ ...item, sale_price_cents: parseInt(e.target.value) || 0 })} placeholder="0 = no sale price set" />
      </label>
      <label className="ap-label">
        Sale badge label
        <input className="ap-input" value={item.sale_label} onChange={(e) => setItem({ ...item, sale_label: e.target.value })} placeholder='e.g. "20% off" or "Weekend deal"' />
      </label>
    </div>

    <div className="credits-admin-toggles">
      <label className="ap-label ap-checkbox-label">
        <input type="checkbox" checked={item.is_featured} onChange={(e) => setItem({ ...item, is_featured: e.target.checked })} />
        Mark as featured / best value
      </label>
      <label className="ap-label ap-checkbox-label">
        <input type="checkbox" checked={item.sale_active} onChange={(e) => setItem({ ...item, sale_active: e.target.checked })} />
        Sale active (uses sale price)
      </label>
      <label className="ap-label ap-checkbox-label">
        <input type="checkbox" checked={item.active} onChange={(e) => setItem({ ...item, active: e.target.checked })} />
        Visible on Buy Credits page
      </label>
    </div>

    <div className="ap-edit-actions">
      <button className="ap-save-btn" type="button" disabled={saving} onClick={onSave}>{saveLabel}</button>
      <button className="ap-cancel-btn" type="button" onClick={onCancel}>Cancel</button>
    </div>
  </div>
);

const AdminCreditsPanel = () => {
  const [packages, setPackages] = useState([]);
  const [editingPkg, setEditingPkg] = useState(null);
  const [addingPkg, setAddingPkg] = useState(false);
  const [newPkg, setNewPkg] = useState(EMPTY_PKG);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('packages');

  const [grantEmail, setGrantEmail] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantMsg, setGrantMsg] = useState(null);

  const [recentGrants, setRecentGrants] = useState([]);

  useEffect(() => {
    loadPackages();
    loadGrants();
  }, []);

  const loadPackages = async () => {
    const { data } = await supabase
      .from('credit_packages')
      .select('*')
      .order('sort_order');
    setPackages(data || []);
  };

  const loadGrants = async () => {
    const { data } = await supabase
      .from('admin_credit_grants')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setRecentGrants(data || []);
  };

  const savePkg = async (item) => {
    setSaving(true);
    await supabase
      .from('credit_packages')
      .update({ ...item, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    setEditingPkg(null);
    await loadPackages();
    setSaving(false);
  };

  const addPkg = async () => {
    if (!newPkg.name || !newPkg.stripe_price_id) return;
    setSaving(true);
    await supabase.from('credit_packages').insert(newPkg);
    setNewPkg(EMPTY_PKG);
    setAddingPkg(false);
    await loadPackages();
    setSaving(false);
  };

  const deletePkg = async (id) => {
    if (!confirm('Delete this credit package? It will no longer appear on the Buy Credits page.')) return;
    await supabase.from('credit_packages').delete().eq('id', id);
    await loadPackages();
  };

  const toggleSale = async (pkg) => {
    await supabase
      .from('credit_packages')
      .update({ sale_active: !pkg.sale_active, updated_at: new Date().toISOString() })
      .eq('id', pkg.id);
    await loadPackages();
  };

  const toggleActive = async (pkg) => {
    await supabase
      .from('credit_packages')
      .update({ active: !pkg.active, updated_at: new Date().toISOString() })
      .eq('id', pkg.id);
    await loadPackages();
  };

  const grantCredits = async () => {
    if (!grantEmail.trim() || !grantAmount || parseInt(grantAmount) <= 0) return;
    setGrantLoading(true);
    setGrantMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    const adminId = user?.id;

    const { data: targetProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, credit_balance, display_name')
      .eq('id',
        (await supabase.auth.admin?.listUsers?.())?.data?.users?.find?.(u => u.email === grantEmail.trim())?.id ?? ''
      )
      .maybeSingle();

    if (profileErr || !targetProfile) {
      const { data: authData } = await supabase
        .from('profiles')
        .select('id, credit_balance, display_name')
        .ilike('display_name', grantEmail.trim())
        .maybeSingle();

      if (!authData) {
        setGrantMsg({ type: 'error', text: 'User not found. Make sure to enter the exact email or display name.' });
        setGrantLoading(false);
        return;
      }

      await doGrant(authData, adminId);
      return;
    }

    await doGrant(targetProfile, adminId);
  };

  const doGrant = async (targetProfile, adminId) => {
    const amount = parseInt(grantAmount);
    const newBalance = (targetProfile.credit_balance ?? 0) + amount;

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ credit_balance: newBalance })
      .eq('id', targetProfile.id);

    if (updateErr) {
      setGrantMsg({ type: 'error', text: 'Failed to update credits. Please try again.' });
      setGrantLoading(false);
      return;
    }

    await supabase.from('credit_transactions').insert({
      user_id: targetProfile.id,
      amount,
      type: 'admin_grant',
      description: grantReason || 'Admin bonus credits',
    });

    await supabase.from('admin_credit_grants').insert({
      admin_id: adminId,
      user_id: targetProfile.id,
      amount,
      reason: grantReason || 'Admin bonus credits',
    });

    setGrantMsg({ type: 'success', text: `Successfully granted ${amount} credits. New balance: ${newBalance}.` });
    setGrantEmail('');
    setGrantAmount('');
    setGrantReason('');
    await loadGrants();
    setGrantLoading(false);
  };

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Credits</p>
          <h2>Credit packages &amp; grants</h2>
        </div>
      </div>

      <div className="ap-tab-bar">
        <button type="button" className={`ap-tab${tab === 'packages' ? ' active' : ''}`} onClick={() => setTab('packages')}>Packages</button>
        <button type="button" className={`ap-tab${tab === 'grant' ? ' active' : ''}`} onClick={() => setTab('grant')}>Grant Credits</button>
        <button type="button" className={`ap-tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>Grant History</button>
      </div>

      {tab === 'packages' && (
        <div>
          <div className="credits-pkg-list">
            {packages.map((pkg) =>
              editingPkg?.id === pkg.id ? (
                <PkgForm
                  key={pkg.id}
                  item={editingPkg}
                  setItem={setEditingPkg}
                  onSave={() => savePkg(editingPkg)}
                  onCancel={() => setEditingPkg(null)}
                  saveLabel="Save package"
                  saving={saving}
                />
              ) : (
                <div key={pkg.id} className={`credits-pkg-row${!pkg.active ? ' credits-pkg-hidden' : ''}${pkg.is_featured ? ' credits-pkg-featured' : ''}`}>
                  <div className="credits-pkg-info">
                    <div className="credits-pkg-name">
                      {pkg.name}
                      {pkg.is_featured && <span className="credits-badge credits-badge-featured">Featured</span>}
                      {!pkg.active && <span className="credits-badge credits-badge-hidden">Hidden</span>}
                      {pkg.sale_active && <span className="credits-badge credits-badge-sale">{pkg.sale_label || 'Sale'}</span>}
                    </div>
                    <div className="credits-pkg-meta">
                      <span>{pkg.credits} credits{pkg.bonus_credits > 0 ? ` + ${pkg.bonus_credits} bonus` : ''}</span>
                      <span className="credits-pkg-sep">·</span>
                      {pkg.sale_active && pkg.sale_price_cents > 0 ? (
                        <>
                          <span className="credits-pkg-original">{fmt(pkg.price_cents)}</span>
                          <span className="credits-pkg-sale-price">{fmt(pkg.sale_price_cents)}</span>
                        </>
                      ) : (
                        <span>{fmt(pkg.price_cents)}</span>
                      )}
                      <span className="credits-pkg-sep">·</span>
                      <span className="credits-pkg-id">{pkg.stripe_price_id}</span>
                    </div>
                  </div>
                  <div className="ap-item-actions">
                    <button type="button" className={`ap-edit-btn${pkg.sale_active ? ' credits-sale-on' : ''}`} onClick={() => toggleSale(pkg)}>
                      {pkg.sale_active ? 'End sale' : 'Start sale'}
                    </button>
                    <button type="button" className="ap-edit-btn" onClick={() => toggleActive(pkg)}>
                      {pkg.active ? 'Hide' : 'Show'}
                    </button>
                    <button type="button" className="ap-edit-btn" onClick={() => setEditingPkg({ ...pkg })}>Edit</button>
                    <button type="button" className="ap-delete-btn" onClick={() => deletePkg(pkg.id)}>Delete</button>
                  </div>
                </div>
              )
            )}
          </div>

          {addingPkg ? (
            <PkgForm
              item={newPkg}
              setItem={setNewPkg}
              onSave={addPkg}
              onCancel={() => { setAddingPkg(false); setNewPkg(EMPTY_PKG); }}
              saveLabel="Add package"
              saving={saving}
            />
          ) : (
            <button type="button" className="ap-add-new-btn" onClick={() => setAddingPkg(true)}>+ Add credit package</button>
          )}
        </div>
      )}

      {tab === 'grant' && (
        <div className="credits-grant-panel">
          <p className="muted" style={{ marginBottom: 24, fontSize: 14 }}>
            Manually add credits to any user account. This creates a transaction record and updates their balance immediately.
          </p>

          {grantMsg && (
            <div className={`credits-grant-msg${grantMsg.type === 'error' ? ' credits-grant-error' : ' credits-grant-success'}`}>
              {grantMsg.text}
            </div>
          )}

          <div className="credits-grant-form">
            <label className="ap-label">
              User display name or email
              <input
                className="ap-input"
                value={grantEmail}
                onChange={(e) => { setGrantEmail(e.target.value); setGrantMsg(null); }}
                placeholder="Display name (as shown in profile)"
              />
              <span className="ap-hint">Enter the user's display name exactly as it appears in their profile.</span>
            </label>
            <label className="ap-label">
              Credits to grant
              <input
                className="ap-input"
                type="number"
                min="1"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                placeholder="e.g. 25"
              />
            </label>
            <label className="ap-label">
              Reason / note (shown in transaction history)
              <input
                className="ap-input"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="e.g. Promotional bonus, contest winner..."
              />
            </label>
            <button
              type="button"
              className="ap-save-btn"
              disabled={grantLoading || !grantEmail.trim() || !grantAmount || parseInt(grantAmount) <= 0}
              onClick={grantCredits}
            >
              {grantLoading ? 'Granting...' : 'Grant credits'}
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {recentGrants.length === 0 ? (
            <p className="muted" style={{ fontSize: 14, padding: '24px 0' }}>No grants yet.</p>
          ) : (
            <div className="credits-grants-table">
              <div className="credits-grants-header">
                <span>User ID</span>
                <span>Amount</span>
                <span>Reason</span>
                <span>Date</span>
              </div>
              {recentGrants.map((g) => (
                <div key={g.id} className="credits-grants-row">
                  <span className="credits-grants-uid">{g.user_id}</span>
                  <span className="credits-grants-amount">+{g.amount}</span>
                  <span className="credits-grants-reason">{g.reason || '—'}</span>
                  <span className="credits-grants-date">{new Date(g.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminCreditsPanel;
