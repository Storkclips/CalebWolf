import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const EMPTY_SESSION = { category: '', label: '', price_display: '', sort_order: 0, notes: '', active: true };
const EMPTY_PRINT = { category: '', label: '', description: '', base_price: '', additional_price: '', sort_order: 0, active: true };

const AdminPricingPanel = () => {
  const [sessionItems, setSessionItems] = useState([]);
  const [printItems, setPrintItems] = useState([]);
  const [tab, setTab] = useState('sessions');
  const [editingSession, setEditingSession] = useState(null);
  const [editingPrint, setEditingPrint] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addingSession, setAddingSession] = useState(false);
  const [addingPrint, setAddingPrint] = useState(false);
  const [newSession, setNewSession] = useState(EMPTY_SESSION);
  const [newPrint, setNewPrint] = useState(EMPTY_PRINT);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('session_pricing').select('*').order('category').order('sort_order'),
      supabase.from('print_sizes').select('*').order('category').order('sort_order'),
    ]);
    setSessionItems(s || []);
    setPrintItems(p || []);
  };

  const saveSession = async (item) => {
    setSaving(true);
    await supabase.from('session_pricing').update({
      category: item.category,
      label: item.label,
      price_display: item.price_display,
      sort_order: item.sort_order,
      notes: item.notes,
      active: item.active,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    setEditingSession(null);
    await loadAll();
    setSaving(false);
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this pricing item?')) return;
    await supabase.from('session_pricing').delete().eq('id', id);
    await loadAll();
  };

  const addSession = async () => {
    if (!newSession.label || !newSession.price_display) return;
    setSaving(true);
    await supabase.from('session_pricing').insert(newSession);
    setNewSession(EMPTY_SESSION);
    setAddingSession(false);
    await loadAll();
    setSaving(false);
  };

  const savePrint = async (item) => {
    setSaving(true);
    await supabase.from('print_sizes').update({
      category: item.category,
      label: item.label,
      description: item.description,
      base_price: parseFloat(item.base_price) || 0,
      additional_price: parseFloat(item.additional_price) || 0,
      sort_order: item.sort_order,
      active: item.active,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    setEditingPrint(null);
    await loadAll();
    setSaving(false);
  };

  const deletePrint = async (id) => {
    if (!confirm('Delete this print size?')) return;
    await supabase.from('print_sizes').delete().eq('id', id);
    await loadAll();
  };

  const addPrint = async () => {
    if (!newPrint.label || !newPrint.category) return;
    setSaving(true);
    await supabase.from('print_sizes').insert({
      ...newPrint,
      base_price: parseFloat(newPrint.base_price) || 0,
      additional_price: parseFloat(newPrint.additional_price) || 0,
    });
    setNewPrint(EMPTY_PRINT);
    setAddingPrint(false);
    await loadAll();
    setSaving(false);
  };

  const sessionCategories = [...new Set(sessionItems.map((s) => s.category))];

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Pricing</p>
          <h2>Session pricing &amp; print sizes</h2>
        </div>
      </div>

      <div className="ap-tab-bar">
        <button type="button" className={`ap-tab${tab === 'sessions' ? ' active' : ''}`} onClick={() => setTab('sessions')}>Session Pricing</button>
        <button type="button" className={`ap-tab${tab === 'prints' ? ' active' : ''}`} onClick={() => setTab('prints')}>Print Sizes</button>
      </div>

      {tab === 'sessions' && (
        <div>
          {sessionCategories.map((cat) => (
            <div key={cat} className="ap-category-block">
              <h3 className="ap-category-title">{cat}</h3>
              <div className="ap-items-list">
                {sessionItems.filter((s) => s.category === cat).map((item) =>
                  editingSession?.id === item.id ? (
                    <div key={item.id} className="ap-edit-card">
                      <div className="ap-edit-grid">
                        <label className="ap-label">Category<input className="ap-input" value={editingSession.category} onChange={(e) => setEditingSession({ ...editingSession, category: e.target.value })} /></label>
                        <label className="ap-label">Label<input className="ap-input" value={editingSession.label} onChange={(e) => setEditingSession({ ...editingSession, label: e.target.value })} /></label>
                        <label className="ap-label">Price display<input className="ap-input" value={editingSession.price_display} onChange={(e) => setEditingSession({ ...editingSession, price_display: e.target.value })} placeholder="e.g. $45 or $150/mo" /></label>
                        <label className="ap-label">Sort order<input className="ap-input" type="number" value={editingSession.sort_order} onChange={(e) => setEditingSession({ ...editingSession, sort_order: parseInt(e.target.value) || 0 })} /></label>
                      </div>
                      <label className="ap-label">Notes / footnote<textarea className="ap-textarea" value={editingSession.notes} onChange={(e) => setEditingSession({ ...editingSession, notes: e.target.value })} /></label>
                      <label className="ap-label ap-checkbox-label"><input type="checkbox" checked={editingSession.active} onChange={(e) => setEditingSession({ ...editingSession, active: e.target.checked })} /> Visible on pricing page</label>
                      <div className="ap-edit-actions">
                        <button className="ap-save-btn" type="button" disabled={saving} onClick={() => saveSession(editingSession)}>Save</button>
                        <button className="ap-cancel-btn" type="button" onClick={() => setEditingSession(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="ap-item-row">
                      <div className="ap-item-info">
                        <span className="ap-item-label">{item.label}</span>
                        <span className="ap-item-price">{item.price_display}</span>
                        {!item.active && <span className="ap-item-hidden">hidden</span>}
                      </div>
                      <div className="ap-item-actions">
                        <button type="button" className="ap-edit-btn" onClick={() => setEditingSession({ ...item })}>Edit</button>
                        <button type="button" className="ap-delete-btn" onClick={() => deleteSession(item.id)}>Delete</button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}

          {addingSession ? (
            <div className="ap-edit-card ap-add-card">
              <h4 className="ap-add-title">New session pricing item</h4>
              <div className="ap-edit-grid">
                <label className="ap-label">Category<input className="ap-input" value={newSession.category} onChange={(e) => setNewSession({ ...newSession, category: e.target.value })} placeholder="e.g. General Photography" /></label>
                <label className="ap-label">Label<input className="ap-input" value={newSession.label} onChange={(e) => setNewSession({ ...newSession, label: e.target.value })} placeholder="e.g. Family Session" /></label>
                <label className="ap-label">Price display<input className="ap-input" value={newSession.price_display} onChange={(e) => setNewSession({ ...newSession, price_display: e.target.value })} placeholder="e.g. $150" /></label>
                <label className="ap-label">Sort order<input className="ap-input" type="number" value={newSession.sort_order} onChange={(e) => setNewSession({ ...newSession, sort_order: parseInt(e.target.value) || 0 })} /></label>
              </div>
              <label className="ap-label">Notes / footnote<textarea className="ap-textarea" value={newSession.notes} onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })} /></label>
              <div className="ap-edit-actions">
                <button className="ap-save-btn" type="button" disabled={saving} onClick={addSession}>Add item</button>
                <button className="ap-cancel-btn" type="button" onClick={() => { setAddingSession(false); setNewSession(EMPTY_SESSION); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" className="ap-add-new-btn" onClick={() => setAddingSession(true)}>+ Add pricing item</button>
          )}
        </div>
      )}

      {tab === 'prints' && (
        <div>
          {printItems.map((item) =>
            editingPrint?.id === item.id ? (
              <div key={item.id} className="ap-edit-card">
                <div className="ap-edit-grid">
                  <label className="ap-label">Category<input className="ap-input" value={editingPrint.category} onChange={(e) => setEditingPrint({ ...editingPrint, category: e.target.value })} /></label>
                  <label className="ap-label">Label<input className="ap-input" value={editingPrint.label} onChange={(e) => setEditingPrint({ ...editingPrint, label: e.target.value })} /></label>
                  <label className="ap-label">Base price ($)<input className="ap-input" type="number" step="0.01" value={editingPrint.base_price} onChange={(e) => setEditingPrint({ ...editingPrint, base_price: e.target.value })} /></label>
                  <label className="ap-label">Additional print price ($)<input className="ap-input" type="number" step="0.01" value={editingPrint.additional_price} onChange={(e) => setEditingPrint({ ...editingPrint, additional_price: e.target.value })} /></label>
                  <label className="ap-label">Description<input className="ap-input" value={editingPrint.description} onChange={(e) => setEditingPrint({ ...editingPrint, description: e.target.value })} /></label>
                  <label className="ap-label">Sort order<input className="ap-input" type="number" value={editingPrint.sort_order} onChange={(e) => setEditingPrint({ ...editingPrint, sort_order: parseInt(e.target.value) || 0 })} /></label>
                </div>
                <label className="ap-label ap-checkbox-label"><input type="checkbox" checked={editingPrint.active} onChange={(e) => setEditingPrint({ ...editingPrint, active: e.target.checked })} /> Visible</label>
                <div className="ap-edit-actions">
                  <button className="ap-save-btn" type="button" disabled={saving} onClick={() => savePrint(editingPrint)}>Save</button>
                  <button className="ap-cancel-btn" type="button" onClick={() => setEditingPrint(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div key={item.id} className="ap-item-row">
                <div className="ap-item-info">
                  <span className="ap-item-label">{item.category} — {item.label}</span>
                  <span className="ap-item-price">${parseFloat(item.base_price).toFixed(2)} base · +${parseFloat(item.additional_price).toFixed(2)} additional</span>
                  {!item.active && <span className="ap-item-hidden">hidden</span>}
                </div>
                <div className="ap-item-actions">
                  <button type="button" className="ap-edit-btn" onClick={() => setEditingPrint({ ...item })}>Edit</button>
                  <button type="button" className="ap-delete-btn" onClick={() => deletePrint(item.id)}>Delete</button>
                </div>
              </div>
            )
          )}

          {addingPrint ? (
            <div className="ap-edit-card ap-add-card">
              <h4 className="ap-add-title">New print size</h4>
              <div className="ap-edit-grid">
                <label className="ap-label">Category<input className="ap-input" value={newPrint.category} onChange={(e) => setNewPrint({ ...newPrint, category: e.target.value })} placeholder="e.g. Small Prints" /></label>
                <label className="ap-label">Label<input className="ap-input" value={newPrint.label} onChange={(e) => setNewPrint({ ...newPrint, label: e.target.value })} placeholder='e.g. Card (2.1" x 3.4")' /></label>
                <label className="ap-label">Base price ($)<input className="ap-input" type="number" step="0.01" value={newPrint.base_price} onChange={(e) => setNewPrint({ ...newPrint, base_price: e.target.value })} /></label>
                <label className="ap-label">Additional print price ($)<input className="ap-input" type="number" step="0.01" value={newPrint.additional_price} onChange={(e) => setNewPrint({ ...newPrint, additional_price: e.target.value })} /></label>
                <label className="ap-label">Description<input className="ap-input" value={newPrint.description} onChange={(e) => setNewPrint({ ...newPrint, description: e.target.value })} /></label>
                <label className="ap-label">Sort order<input className="ap-input" type="number" value={newPrint.sort_order} onChange={(e) => setNewPrint({ ...newPrint, sort_order: parseInt(e.target.value) || 0 })} /></label>
              </div>
              <div className="ap-edit-actions">
                <button className="ap-save-btn" type="button" disabled={saving} onClick={addPrint}>Add size</button>
                <button className="ap-cancel-btn" type="button" onClick={() => { setAddingPrint(false); setNewPrint(EMPTY_PRINT); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" className="ap-add-new-btn" onClick={() => setAddingPrint(true)}>+ Add print size</button>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminPricingPanel;
