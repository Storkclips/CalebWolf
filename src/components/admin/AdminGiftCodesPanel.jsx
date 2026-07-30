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

const BatchModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({
    count: 10,
    credits: 10,
    max_uses: 1,
    expires_at: '',
    active: true,
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.count || form.count < 1) return setErr('Quantity must be at least 1.');
    if (form.count > 500) return setErr('Maximum 500 codes per batch.');
    if (!form.credits || form.credits < 1) return setErr('Credits must be at least 1.');

    setSaving(true);
    setErr('');

    const batchId = crypto.randomUUID();
    const rows = Array.from({ length: Number(form.count) }, () => ({
      code: generateCode(),
      credits: Number(form.credits),
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      expires_at: form.expires_at || null,
      active: form.active,
      note: form.note.trim() || null,
      use_count: 0,
      batch_id: batchId,
    }));

    const { error } = await supabase.from('gift_codes').insert(rows);

    setSaving(false);
    if (error) return setErr(error.message);
    onSave(batchId);
  };

  return (
    <div className="adm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal">
        <div className="adm-modal-header">
          <h3>Generate Batch of Codes</h3>
          <button className="adm-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="adm-modal-body">
          {err && <div className="adm-error">{err}</div>}

          <p className="adm-batch-intro">
            All codes in the batch share the same credits, max uses, expiry, and note —
            each code is unique and tracked individually.
          </p>

          <div className="adm-field">
            <label className="adm-label">Quantity</label>
            <input
              className="adm-input"
              type="number"
              min="1"
              max="500"
              value={form.count}
              onChange={(e) => set('count', e.target.value)}
            />
          </div>

          <div className="adm-field-row">
            <div className="adm-field">
              <label className="adm-label">Credits per code</label>
              <input
                className="adm-input"
                type="number"
                min="1"
                value={form.credits}
                onChange={(e) => set('credits', e.target.value)}
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">Max uses per code <span className="adm-label-hint">(blank = unlimited)</span></label>
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
            <label className="adm-label">Internal note <span className="adm-label-hint">(shared by all codes in batch)</span></label>
            <input
              className="adm-input"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="e.g. Holiday giveaway December 2026"
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
            {saving ? 'Generating…' : `Generate ${form.count} codes`}
          </button>
        </div>
      </div>
    </div>
  );
};

const BatchResultsModal = ({ batchId, onClose }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('gift_codes')
        .select('id, code, use_count, max_uses, active, expires_at')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });
      setRows(data || []);
      setLoading(false);
    };
    load();
  }, [batchId]);

  const allCodesText = rows.map((r) => r.code).join('\n');

  const handleCopyAll = () => {
    navigator.clipboard.writeText(allCodesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const lines = rows.map((r) => {
      const status = r.use_count > 0 ? 'USED' : 'VALID';
      return `${r.code}\t${status}`;
    });
    const header = `# Gift Code Batch\n# Generated: ${new Date().toLocaleString()}\n# Total: ${rows.length}\n# Format: CODE<TAB>STATUS\n\n${lines.join('\n')}`;
    const blob = new Blob([header], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gift-codes-batch-${batchId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="adm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal adm-modal-wide">
        <div className="adm-modal-header">
          <h3>Batch Generated — {rows.length || '…'} codes</h3>
          <button className="adm-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="adm-modal-body">
          {loading ? (
            <p className="muted">Loading…</p>
          ) : (
            <>
              <div className="adm-batch-actions">
                <button className="adm-btn-primary" onClick={handleCopyAll}>
                  {copied ? 'Copied!' : 'Copy all codes'}
                </button>
                <button className="adm-btn-ghost" onClick={handleDownload}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download .txt
                </button>
              </div>

              <div className="adm-batch-list">
                {rows.map((r, i) => {
                  const used = r.use_count > 0;
                  const exhausted = r.max_uses !== null && r.use_count >= r.max_uses;
                  const expired = r.expires_at && new Date(r.expires_at) < new Date();
                  return (
                    <div key={r.id} className={`adm-batch-code-row${used || exhausted || expired ? ' used' : ''}`}>
                      <span className="adm-batch-code-num">{i + 1}</span>
                      <code className="adm-batch-code-text">{r.code}</code>
                      <span className={`adm-batch-status ${used || exhausted || expired ? 'adm-batch-status-used' : 'adm-batch-status-valid'}`}>
                        {exhausted ? 'Maxed' : expired ? 'Expired' : used ? 'Used' : 'Valid'}
                      </span>
                      <button
                        className="adm-icon-btn"
                        onClick={() => navigator.clipboard.writeText(r.code)}
                        title="Copy"
                        aria-label="Copy code"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
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

const BatchRow = ({ batch, onCopyAll, onDownload, onToggle, expanded, onRedeem }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded || rows.length > 0) return;
    setLoading(true);
    const load = async () => {
      const { data } = await supabase
        .from('gift_codes')
        .select('id, code, use_count, max_uses, active, expires_at')
        .eq('batch_id', batch.batch_id)
        .order('created_at', { ascending: true });
      setRows(data || []);
      setLoading(false);
    };
    load();
  }, [expanded]);

  const validCount = rows.filter((r) => {
    const exhausted = r.max_uses !== null && r.use_count >= r.max_uses;
    const expired = r.expires_at && new Date(r.expires_at) < new Date();
    return !exhausted && !expired && r.active;
  }).length;

  return (
    <>
      <tr className="adm-batch-header-row" onClick={onToggle}>
        <td colSpan={7}>
          <div className="adm-batch-row-content">
            <div className="adm-batch-chevron">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
            <span className="adm-batch-label">Batch</span>
            <span className="adm-batch-count">{batch.count} codes</span>
            <span className="adm-batch-credits">{batch.credits} credits each</span>
            {batch.note && <span className="adm-batch-note">{batch.note}</span>}
            <div className="adm-batch-row-actions">
              {rows.length > 0 && (
                <span className="adm-batch-valid-badge">
                  {validCount} valid / {rows.length - validCount} used
                </span>
              )}
              <button className="adm-btn-ghost adm-btn-sm" onClick={(e) => { e.stopPropagation(); onCopyAll(batch.batch_id); }}>
                Copy all
              </button>
              <button className="adm-btn-ghost adm-btn-sm" onClick={(e) => { e.stopPropagation(); onDownload(batch.batch_id); }}>
                Download
              </button>
            </div>
          </div>
        </td>
      </tr>
      {expanded && (
        <>
          {loading ? (
            <tr><td colSpan={7} className="adm-batch-loading">Loading codes…</td></tr>
          ) : (
            rows.map((r, i) => {
              const exhausted = r.max_uses !== null && r.use_count >= r.max_uses;
              const expired = r.expires_at && new Date(r.expires_at) < new Date();
              const used = r.use_count > 0;
              return (
                <tr key={r.id} className={`adm-batch-code-detail${used || exhausted || expired ? ' adm-row-dim' : ''}`}>
                  <td>
                    <div className="adm-code-cell">
                      <span className="adm-batch-code-num">{i + 1}</span>
                      <code className="adm-code-text">{r.code}</code>
                      <button className="adm-icon-btn" onClick={() => navigator.clipboard.writeText(r.code)} title="Copy" aria-label="Copy code">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td><strong>{r.credits ?? batch.credits}</strong></td>
                  <td>
                    <button className="adm-uses-btn" onClick={() => onRedeem(r.id, r.code)} title="View redemptions">
                      {r.max_uses === null ? `${r.use_count} / ∞` : `${r.use_count} / ${r.max_uses}`}
                      {exhausted && <span className="adm-badge adm-badge-warn">maxed</span>}
                    </button>
                  </td>
                  <td className={expired ? 'adm-text-danger' : ''}>
                    {r.expires_at ? fmtDate(r.expires_at) : '—'}
                    {expired && <span className="adm-badge adm-badge-danger">expired</span>}
                  </td>
                  <td className="adm-table-muted">{r.note || batch.note || '—'}</td>
                  <td>
                    <span className={`adm-batch-status ${used || exhausted || expired ? 'adm-batch-status-used' : 'adm-batch-status-valid'}`}>
                      {exhausted ? 'Maxed' : expired ? 'Expired' : used ? 'Used' : 'Valid'}
                    </span>
                  </td>
                  <td />
                </tr>
              );
            })
          )}
        </>
      )}
    </>
  );
};

const AdminGiftCodesPanel = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);
  const [expandedBatches, setExpandedBatches] = useState({});

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

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Delete all codes in this batch? This cannot be undone.')) return;
    const batchCodes = codes.filter((c) => c.batch_id === batchId);
    for (const c of batchCodes) {
      await supabase.from('gift_code_redemptions').delete().eq('code_id', c.id);
    }
    await supabase.from('gift_codes').delete().eq('batch_id', batchId);
    setCodes((prev) => prev.filter((c) => c.batch_id !== batchId));
  };

  const copyCode = (code) => navigator.clipboard.writeText(code);

  const copyBatchAll = async (batchId) => {
    const batchCodes = codes.filter((c) => c.batch_id === batchId).map((c) => c.code);
    navigator.clipboard.writeText(batchCodes.join('\n'));
  };

  const downloadBatch = (batchId) => {
    const batchCodes = codes.filter((c) => c.batch_id === batchId);
    const lines = batchCodes.map((r) => {
      const exhausted = r.max_uses !== null && r.use_count >= r.max_uses;
      const expired = r.expires_at && new Date(r.expires_at) < new Date();
      const status = (exhausted || expired || r.use_count > 0) ? 'USED' : 'VALID';
      return `${r.code}\t${status}`;
    });
    const header = `# Gift Code Batch\n# Generated: ${new Date().toLocaleString()}\n# Total: ${batchCodes.length}\n# Format: CODE<TAB>STATUS\n\n${lines.join('\n')}`;
    const blob = new Blob([header], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gift-codes-batch-${batchId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleBatch = (batchId) => {
    setExpandedBatches((prev) => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  const filtered = codes.filter((c) => {
    const matchSearch = c.code.includes(search.toUpperCase()) ||
      (c.note?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      filter === 'all' ? true :
      filter === 'active' ? c.active :
      !c.active;
    return matchSearch && matchFilter;
  });

  const batches = {};
  const standalone = [];
  filtered.forEach((c) => {
    if (c.batch_id) {
      if (!batches[c.batch_id]) {
        batches[c.batch_id] = { batch_id: c.batch_id, codes: [], credits: c.credits, note: c.note, count: 0 };
      }
      batches[c.batch_id].codes.push(c);
      batches[c.batch_id].count += 1;
    } else {
      standalone.push(c);
    }
  });

  const batchList = Object.values(batches).sort((a, b) => {
    const aDate = a.codes[0]?.created_at || '';
    const bDate = b.codes[0]?.created_at || '';
    return bDate.localeCompare(aDate);
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
        <div className="adm-header-actions">
          <button className="adm-btn-ghost" onClick={() => setModal('batch')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            Generate batch
          </button>
          <button className="adm-btn-primary" onClick={() => setModal('create')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New code
          </button>
        </div>
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
              {batchList.map((batch) => (
                <BatchRow
                  key={batch.batch_id}
                  batch={batch}
                  expanded={!!expandedBatches[batch.batch_id]}
                  onToggle={() => toggleBatch(batch.batch_id)}
                  onCopyAll={copyBatchAll}
                  onDownload={downloadBatch}
                  onRedeem={(id, code) => setDrawer({ id, code })}
                />
              ))}
              {standalone.map((c) => {
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

      {modal && modal !== 'batch' && (
        <CodeModal
          initial={modal === 'create' ? null : modal}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'batch' && (
        <BatchModal
          onSave={(batchId) => { setModal(null); load(); setBatchResults(batchId); }}
          onClose={() => setModal(null)}
        />
      )}
      {batchResults && (
        <BatchResultsModal
          batchId={batchResults}
          onClose={() => setBatchResults(null)}
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
