import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── single question editor ─────────────────────────────────────────────────

const FaqEditor = ({ item, index, total, onChange, onRemove, onMove, disabled }) => {
  const [open, setOpen] = useState(true);
  const update = (field, val) => onChange({ ...item, [field]: val });

  return (
    <div className="adm-about-sec-wrap">
      <div className="adm-about-sec-header">
        <button type="button" className="adm-about-sec-toggle" onClick={() => setOpen(o => !o)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .15s' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="adm-about-sec-type-badge">Q{index + 1}</span>
          <span className="adm-about-sec-label-input" style={{ opacity: 0.75 }}>
            {item.question || 'Untitled question'}
          </span>
        </button>
        <div className="adm-about-sec-actions">
          <button type="button" className="adm-about-icon-btn" onClick={() => onMove(index, -1)} disabled={index === 0 || disabled} title="Move up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button type="button" className="adm-about-icon-btn" onClick={() => onMove(index, 1)} disabled={index === total - 1 || disabled} title="Move down">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <button type="button" className="adm-about-icon-btn adm-about-icon-btn--danger" onClick={onRemove} disabled={disabled} title="Remove question">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="adm-about-sec-body">
          <div className="adm-settings-form">
            <label className="adm-settings-label">
              Question
              <input
                type="text"
                value={item.question}
                onChange={e => update('question', e.target.value)}
                disabled={disabled}
                placeholder="What would you like to ask?"
              />
            </label>
            <label className="adm-settings-label">
              Answer
              <textarea
                rows={3}
                value={item.answer}
                onChange={e => update('answer', e.target.value)}
                disabled={disabled}
                placeholder="And the answer…"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── main panel ──────────────────────────────────────────────────────────────

const AdminFaqPanel = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('faq_items')
        .select('id, question, answer, position')
        .order('position', { ascending: true });
      if (!error) setItems(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const updateItem = (idx, item) => setItems(prev => prev.map((it, i) => i === idx ? item : it));
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const moveItem = (idx, dir) => {
    setItems(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const addItem = () => setItems(prev => [...prev, { id: uid(), question: '', answer: '', position: prev.length }]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    // Full-replace strategy: delete removed rows, then upsert the rest with
    // fresh positions. Deletes run first so re-adding a question with the
    // same text never conflicts.
    const knownIds = new Set();
    const toUpsert = items.map((it, i) => {
      const isExisting = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.id);
      if (isExisting) knownIds.add(it.id);
      return {
        id: isExisting ? it.id : undefined,
        question: (it.question || '').trim(),
        answer: (it.answer || '').trim(),
        position: i,
      };
    }).filter(it => it.question);

    await supabase
      .from('faq_items')
      .delete()
      .not('id', 'in', `(${[...knownIds].join(',') || '00000000-0000-0000-0000-000000000000'})`);

    const { error: upsertError } = await supabase
      .from('faq_items')
      .upsert(toUpsert, { onConflict: 'id' });

    if (upsertError) {
      setMsg({ type: 'error', text: upsertError.message });
      setSaving(false);
      return;
    }

    // Reload to pick up generated ids for newly added questions.
    const { data } = await supabase
      .from('faq_items')
      .select('id, question, answer, position')
      .order('position', { ascending: true });
    setItems(data ?? []);
    setMsg({ type: 'success', text: 'Questions saved.' });
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  if (loading) {
    return (
      <div className="adm-panel">
        <div className="adm-users-loading">
          <div className="adm-users-loading-spinner" />
          <p className="muted">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <p className="eyebrow">Content</p>
          <h2>Homepage Questions</h2>
          <p className="muted">Add, edit, reorder, or remove the questions in the "Questions, answered" section on the homepage.</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="ghost">Preview →</a>
      </div>

      <form onSubmit={handleSave}>
        <div className="adm-about-sections-list">
          {items.map((item, idx) => (
            <FaqEditor
              key={item.id}
              item={item}
              index={idx}
              total={items.length}
              onChange={(it) => updateItem(idx, it)}
              onRemove={() => removeItem(idx)}
              onMove={moveItem}
              disabled={saving}
            />
          ))}
          {items.length === 0 && (
            <p className="muted small" style={{ textAlign: 'center', padding: '32px 0' }}>
              No questions yet. Add one below.
            </p>
          )}
        </div>

        <div className="adm-about-add-section-row">
          <button type="button" className="ghost" onClick={addItem} disabled={saving}>
            + Add question
          </button>
        </div>

        {msg && (
          <div className={msg.type === 'success' ? 'notice' : 'auth-error'} style={{ margin: '12px 0 0' }}>
            {msg.text}
          </div>
        )}

        <div className="adm-about-save-row">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save questions'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminFaqPanel;
