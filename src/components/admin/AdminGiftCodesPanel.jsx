import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-');
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const EMPTY_FORM = {
  code: '',
  credits: 10,
  max_uses: '',
  expires_at: '',
  active: true,
  note: '',
};

const CodeModal = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial ?? { ...EMPTY_FORM, code: generateCode() });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.code.trim()) return setErr('Code is required.');
    if (!form.credits || form.credits < 1) return setErr('Credits must be at least 1.');

    setSaving(true);
    setErr('');

    const payload = {
      code: form.code.trim().toUpperCase(),
      credits: Number(form.credits),
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      expires_at: form.expires_at || null,
      active: form.active,
      note: form.note.trim() || null,
    };

    let error;
    if (initial?.id) {
      ({ error } = await supabase.from('gift_codes').update(payload).eq('id', initial.id));
    } else {
      ({ error } = await supabase.from('gift_codes').insert({ ...payload, use_count: 0 }));
    }

    setSaving(false);
    if (error) return setErr(error.message);
    onSave();
  };

  return (
    <div className="adm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal">
        <div className="adm-modal-header">
          <h3>{initial?.id ? 'Edit Gift Code' : 'Create Gift Code'}</h3>
          <button className="adm-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="adm-modal-body">
          {err && <div className="adm-error">{err}</div>}

          <div className="adm-field">
            <label className="adm-label">Code</label>
            <div className="adm-code-row">
              <input
                className="adm-input adm-input-mono"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={19}
                spellCheck={false}
              />
              <button
                type="button"
                className="adm-btn-ghost"
                onClick={() => set('code', generateCode())}
                title="Generate random code"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="adm-field-row">
            <div className="adm-field">
              <label className="adm-label">Credits granted</label>
              <input
                className="adm-input"
                type="number"
                min="1"
                value={form.credits}
                onChange={(e) => set('credits', e.target.value)}
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">Max uses <span className="adm-label-hint">(blank = unlimited)</span></label>
              <input
                className="adm-input"
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => set('max_uses', e.target.value)}
                placeholder="∞"
              />
            </div>
          </div>

          <div className="adm-field">
            <label className="adm-label">Expires <span className="adm-label-hint">(blank = never)</span></label>
            <input
              className="adm-input"
              type="date"
              value={form.expires_at}
              onChange={(e) => set('expires_at', e.target.value)}
            />
          </div>

          <div className="adm-field">
            <label className="adm-label">Internal note</label>
            <input
              className="adm-input"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="e.g. Influencer campaign June 2026"
            />
          </div>

          <div className="adm-field adm-field-toggle">
            <label className="adm-toggle-label">
              <div className={`adm-toggle${form.active ? ' on' : ''}`} onClick={() => set('active', !form.active)}>
                <div className="adm-toggle-thumb" />
              </div>
              Active
            </label>
            <span className="adm-label-hint">Inactive codes cannot be redeemed</span>
          </div>
        </div>

        <div className="adm-modal-footer">
          <button className="adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : initial?.id ? 'Save changes' : 'Create code'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RedemptionsDrawer = ({ codeId, codeName, onClose }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('gift_code_redemptions')
        .select('id, created_at, credits_granted, profiles(display_name, email)')
        .eq('code_id', codeId)
        .order('created_at', { ascending: false });
      setRows(data || []);
      setLoading(false);
    };
    load();
  }, [codeId]);

  return (
    <div className="adm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal adm-modal-wide">
        <div className="adm-modal-header">
          <h3>Redemptions — <span className="adm-code-badge">{codeName}</span></h3>
          <button className="adm-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="adm-modal-body">
          {loading ? (
            <p className="muted">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="muted">No redemptions yet.</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Credits</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="adm-table-primary">{r.profiles?.display_name || '—'}</span>
                      <span className="adm-table-secondary">{r.profiles?.email || ''}</span>
                    </td>
                    <td>{r.credits_granted}</td>
                    <td>{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminGiftCodesPanel = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gift_codes')
      .select('*')
      .order('created_at', { ascending: false });
    setCodes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (code) => {
    await supabase.from('gift_codes').update({ active: !code.active }).eq('id', code.id);
    setCodes((prev) => prev.map((c) => c.id === code.id ? { ...c, active: !c.active } : c));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gift code? This cannot be undone.')) return;
    setDeleting(id);
    await supabase.from('gift_code_redemptions').delete().eq('code_id', id);
    await supabase.from('gift_codes').delete().eq('id', id);
    setCodes((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  };

  const copyCode = (code) => navigator.clipboard.writeText(code);

  const filtered = codes.filter((c) => {
    const matchSearch = c.code.includes(search.toUpperCase()) ||
      (c.note?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      filter === 'all' ? true :
      filter === 'active' ? c.active :
      !c.active;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: codes.length,
    active: codes.filter((c) => c.active).length,
    totalRedemptions: codes.reduce((s, c) => s + (c.use_count || 0), 0),
    totalCredits: codes.reduce((s, c) => s + (c.use_count || 0) * c.credits, 0),
  };

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <h2 className="adm-panel-title">Gift Codes</h2>
          <p className="adm-panel-sub">Create and manage redeemable credit codes</p>
        </div>
        <button className="adm-btn-primary" onClick={() => setModal('create')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New code
        </button>
      </div>

      <div className="adm-stats-row">
        <div className="adm-stat">
          <span className="adm-stat-value">{stats.total}</span>
          <span className="adm-stat-label">Total codes</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-value">{stats.active}</span>
          <span className="adm-stat-label">Active</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-value">{stats.totalRedemptions}</span>
          <span className="adm-stat-label">Redemptions</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-value">{stats.totalCredits.toLocaleString()}</span>
          <span className="adm-stat-label">Credits issued</span>
        </div>
      </div>

      <div className="adm-filters">
        <input
          className="adm-search"
          type="search"
          placeholder="Search codes or notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="adm-filter-tabs">
          {['all', 'active', 'inactive'].map((f) => (
            <button
              key={f}
              className={`adm-filter-tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="adm-empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">
          {codes.length === 0 ? 'No gift codes yet. Create one to get started.' : 'No codes match your search.'}
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Credits</th>
                <th>Uses</th>
                <th>Expires</th>
                <th>Note</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const usesDisplay = c.max_uses === null
                  ? `${c.use_count} / ∞`
                  : `${c.use_count} / ${c.max_uses}`;
                const exhausted = c.max_uses !== null && c.use_count >= c.max_uses;
                const expired = c.expires_at && new Date(c.expires_at) < new Date();

                return (
                  <tr key={c.id} className={!c.active || exhausted || expired ? 'adm-row-dim' : ''}>
                    <td>
                      <div className="adm-code-cell">
                        <code className="adm-code-text">{c.code}</code>
                        <button
                          className="adm-icon-btn"
                          onClick={() => copyCode(c.code)}
                          title="Copy code"
                          aria-label="Copy code"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td><strong>{c.credits}</strong></td>
                    <td>
                      <button
                        className="adm-uses-btn"
                        onClick={() => setDrawer({ id: c.id, code: c.code })}
                        title="View redemptions"
                      >
                        {usesDisplay}
                        {exhausted && <span className="adm-badge adm-badge-warn">maxed</span>}
                      </button>
                    </td>
                    <td className={expired ? 'adm-text-danger' : ''}>
                      {c.expires_at ? fmtDate(c.expires_at) : '—'}
                      {expired && <span className="adm-badge adm-badge-danger">expired</span>}
                    </td>
                    <td className="adm-table-muted">{c.note || '—'}</td>
                    <td>
                      <div
                        className={`adm-toggle${c.active ? ' on' : ''}`}
                        onClick={() => handleToggleActive(c)}
                        title={c.active ? 'Deactivate' : 'Activate'}
                        role="switch"
                        aria-checked={c.active}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleToggleActive(c)}
                      >
                        <div className="adm-toggle-thumb" />
                      </div>
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button
                          className="adm-icon-btn"
                          onClick={() => setModal(c)}
                          title="Edit"
                          aria-label="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="adm-icon-btn adm-icon-btn-danger"
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                          title="Delete"
                          aria-label="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <CodeModal
          initial={modal === 'create' ? null : modal}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
      {drawer && (
        <RedemptionsDrawer
          codeId={drawer.id}
          codeName={drawer.code}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
};

export default AdminGiftCodesPanel;
