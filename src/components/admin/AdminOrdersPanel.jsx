import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const STATUS_OPTIONS = ['pending', 'confirmed', 'printed', 'shipped', 'delivered', 'cancelled'];

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  printed: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

const AdminOrdersPanel = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('print_orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    await supabase.from('print_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    setUpdatingId(null);
  };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Orders</p>
          <h2>Print orders</h2>
        </div>
        <button type="button" className="ghost" onClick={loadOrders}>Refresh</button>
      </div>

      <div className="orders-filter-bar">
        <button type="button" className={`orders-filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          All <span className="orders-count">{orders.length}</span>
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`orders-filter-btn${filter === s ? ' active' : ''}`}
            onClick={() => setFilter(s)}
            style={{ '--status-color': STATUS_COLORS[s] }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {counts[s] > 0 && <span className="orders-count">{counts[s]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading orders...</p>
      ) : filtered.length === 0 ? (
        <p className="muted">No orders found.</p>
      ) : (
        <div className="orders-list">
          {filtered.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                <div className="order-card-left">
                  <div className="order-thumb-wrap">
                    <img src={order.image_url} alt={order.image_title} className="order-thumb" />
                  </div>
                  <div className="order-card-info">
                    <span className="order-image-title">{order.image_title || 'Untitled image'}</span>
                    <span className="order-print-size">{order.print_size_label}</span>
                    <span className="order-customer">{order.customer_name} · {order.customer_email}</span>
                  </div>
                </div>
                <div className="order-card-right">
                  <span className="order-total">${parseFloat(order.total_price).toFixed(2)}</span>
                  <span
                    className="order-status-badge"
                    style={{ background: `${STATUS_COLORS[order.status]}22`, color: STATUS_COLORS[order.status], border: `1px solid ${STATUS_COLORS[order.status]}44` }}
                  >
                    {order.status}
                  </span>
                  <span className="order-date">{new Date(order.created_at).toLocaleDateString()}</span>
                  <span className="order-expand-icon">{expandedId === order.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedId === order.id && (
                <div className="order-card-detail">
                  <div className="order-detail-grid">
                    <div>
                      <p className="order-detail-label">Customer</p>
                      <p className="order-detail-val">{order.customer_name}</p>
                      <p className="order-detail-val">{order.customer_email}</p>
                    </div>
                    <div>
                      <p className="order-detail-label">Shipping address</p>
                      <p className="order-detail-val" style={{ whiteSpace: 'pre-line' }}>{order.shipping_address || '—'}</p>
                    </div>
                    <div>
                      <p className="order-detail-label">Order details</p>
                      <p className="order-detail-val">Qty: {order.quantity}</p>
                      <p className="order-detail-val">Unit: ${parseFloat(order.unit_price).toFixed(2)}</p>
                      <p className="order-detail-val">Total: ${parseFloat(order.total_price).toFixed(2)}</p>
                    </div>
                    {order.notes && (
                      <div>
                        <p className="order-detail-label">Notes</p>
                        <p className="order-detail-val">{order.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="order-status-row">
                    <span className="order-detail-label">Update status:</span>
                    <div className="order-status-btns">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={updatingId === order.id || order.status === s}
                          className={`order-status-btn${order.status === s ? ' current' : ''}`}
                          style={order.status === s ? { background: `${STATUS_COLORS[s]}22`, color: STATUS_COLORS[s], border: `1px solid ${STATUS_COLORS[s]}55` } : {}}
                          onClick={() => updateStatus(order.id, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default AdminOrdersPanel;
