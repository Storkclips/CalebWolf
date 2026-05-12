import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const AdminUsersPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: profiles, error: err } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setUsers(profiles || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleForcePasswordReset = async (userId) => {
    try {
      setError('');

      const { error: err } = await supabase
        .from('profiles')
        .update({
          force_change_password: true,
          password_reset_required: true
        })
        .eq('id', userId);

      if (err) throw err;

      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, force_change_password: true, password_reset_required: true }
          : u
      ));

      setShowModal(false);
      setForcePasswordChange(false);
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleClearForceReset = async (userId) => {
    try {
      setError('');

      const { error: err } = await supabase
        .from('profiles')
        .update({
          force_change_password: false,
          password_reset_required: false
        })
        .eq('id', userId);

      if (err) throw err;

      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, force_change_password: false, password_reset_required: false }
          : u
      ));
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <p className="muted">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>User Management</h3>
        <p className="muted small">Force password resets and manage user accounts.</p>
      </div>

      {error && (
        <div className="admin-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="admin-users-list">
        {users.length === 0 ? (
          <p className="muted">No users found.</p>
        ) : (
          <div className="admin-table">
            <div className="admin-table-header">
              <div className="admin-table-cell">Email</div>
              <div className="admin-table-cell">Credits</div>
              <div className="admin-table-cell">Admin</div>
              <div className="admin-table-cell">Force Reset</div>
              <div className="admin-table-cell">Actions</div>
            </div>
            {users.map((user) => (
              <div key={user.id} className="admin-table-row">
                <div className="admin-table-cell">
                  <div>
                    <p className="bold" style={{ marginBottom: '4px' }}>
                      {user.display_name || 'N/A'}
                    </p>
                    <p className="muted small" style={{ margin: 0 }}>
                      {user.id}
                    </p>
                  </div>
                </div>
                <div className="admin-table-cell">{user.credit_balance}</div>
                <div className="admin-table-cell">
                  {user.is_admin ? (
                    <span style={{ color: '#22c55e' }}>Yes</span>
                  ) : (
                    <span className="muted">No</span>
                  )}
                </div>
                <div className="admin-table-cell">
                  {user.force_change_password ? (
                    <span style={{ color: '#f59e0b' }}>Required</span>
                  ) : (
                    <span className="muted">No</span>
                  )}
                </div>
                <div className="admin-table-cell">
                  {user.force_change_password ? (
                    <button
                      className="ghost small-btn"
                      onClick={() => handleClearForceReset(user.id)}
                    >
                      Clear
                    </button>
                  ) : (
                    <button
                      className="ghost small-btn"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowModal(true);
                      }}
                    >
                      Force Reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && selectedUser && (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h4>Force Password Reset</h4>
              <button
                type="button"
                className="ghost"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Force {selectedUser.display_name || selectedUser.id} to reset their
                password on next login?
              </p>
              <p className="muted small">
                This will require them to reset their password before accessing their account.
              </p>
            </div>
            <div className="admin-modal-actions">
              <button
                className="pill"
                onClick={() => {
                  handleForcePasswordReset(selectedUser.id);
                }}
              >
                Force Reset
              </button>
              <button
                className="ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPanel;
