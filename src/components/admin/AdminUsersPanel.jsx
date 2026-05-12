import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const PAGE_SIZE = 25;

const AdminUsersPanel = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (debouncedSearch.trim()) {
        query = query.ilike('display_name', `%${debouncedSearch.trim()}%`);
      }

      const { data, error: err, count } = await query;
      if (err) throw err;
      setUsers(data || []);
      setTotal(count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleForcePasswordReset = async (userId) => {
    try {
      setError('');
      const { error: err } = await supabase
        .from('profiles')
        .update({ force_change_password: true, password_reset_required: true })
        .eq('id', userId);
      if (err) throw err;
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, force_change_password: true, password_reset_required: true } : u
      ));
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleClearForceReset = async (userId) => {
    try {
      setError('');
      const { error: err } = await supabase
        .from('profiles')
        .update({ force_change_password: false, password_reset_required: false })
        .eq('id', userId);
      if (err) throw err;
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, force_change_password: false, password_reset_required: false } : u
      ));
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>User Management</h3>
        <p className="muted small">Search, browse and manage all user accounts.</p>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* Search + count */}
      <div className="adm-users-toolbar">
        <div className="adm-users-search-wrap">
          <svg className="adm-users-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            className="adm-users-search"
            type="text"
            placeholder="Search by display name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="adm-users-search-clear" onClick={() => setSearch('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <span className="adm-users-count">
          {loading ? '—' : `${total} user${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {loading ? (
        <div className="adm-users-loading">
          <div className="adm-users-loading-spinner" />
          <span className="muted small">Loading users…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="adm-users-empty">
          <p className="muted">No users found{debouncedSearch ? ` for "${debouncedSearch}"` : ''}.</p>
        </div>
      ) : (
        <>
          <div className="admin-table">
            <div className="admin-table-header">
              <div className="admin-table-cell">User</div>
              <div className="admin-table-cell">Credits</div>
              <div className="admin-table-cell">Admin</div>
              <div className="admin-table-cell">Force Reset</div>
              <div className="admin-table-cell">Actions</div>
            </div>
            {users.map((user) => (
              <div key={user.id} className="admin-table-row">
                <div className="admin-table-cell">
                  <div>
                    <p className="bold" style={{ marginBottom: '2px', fontSize: '14px' }}>
                      {user.display_name || <span className="muted">No name</span>}
                    </p>
                    <p className="muted small" style={{ margin: 0, fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.02em' }}>
                      {user.id}
                    </p>
                  </div>
                </div>
                <div className="admin-table-cell">{user.credit_balance ?? 0}</div>
                <div className="admin-table-cell">
                  {user.is_admin
                    ? <span className="admin-badge selling">Admin</span>
                    : <span className="muted small">—</span>}
                </div>
                <div className="admin-table-cell">
                  {user.force_change_password
                    ? <span className="admin-badge paused">Required</span>
                    : <span className="muted small">—</span>}
                </div>
                <div className="admin-table-cell">
                  {user.force_change_password ? (
                    <button className="ghost small-btn" onClick={() => handleClearForceReset(user.id)}>
                      Clear reset
                    </button>
                  ) : (
                    <button className="ghost small-btn" onClick={() => { setSelectedUser(user); setShowModal(true); }}>
                      Force reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="adm-pagination">
              <button
                type="button"
                className="adm-page-btn"
                onClick={() => setPage(0)}
                disabled={page === 0}
              >
                «
              </button>
              <button
                type="button"
                className="adm-page-btn"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ‹
              </button>
              <span className="adm-page-info">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                className="adm-page-btn"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                ›
              </button>
              <button
                type="button"
                className="adm-page-btn"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
              >
                »
              </button>
            </div>
          )}
        </>
      )}

      {showModal && selectedUser && (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h4>Force Password Reset</h4>
              <button type="button" className="ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <p>Force <strong>{selectedUser.display_name || selectedUser.id}</strong> to reset their password on next login?</p>
              <p className="muted small">They will be required to set a new password before accessing their account.</p>
            </div>
            <div className="admin-modal-actions">
              <button className="ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="pill" onClick={() => handleForcePasswordReset(selectedUser.id)}>Force Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPanel;
