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

const LongTextReveal = ({ label, value, maxLength = 28 }) => {
  const [open, setOpen] = useState(false);

  if (!value) return <span>—</span>;

  const text = String(value);
  const isLong = text.length > maxLength;

  if (!isLong) return <span>{text}</span>;

  return (
    <span className="long-text-reveal">
      {!open ? (
        <button
          type="button"
          className="long-text-btn"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          title={`Reveal ${label}`}
        >
          Click to reveal
        </button>
      ) : (
        <span className="long-text-open">
          <span className="long-text-value">{text}</span>
          <button
            type="button"
            className="long-text-hide"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            Hide
          </button>
        </span>
      )}
    </span>
  );
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

    const { data, error } = await supabase
      .from('print_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading print orders:', error);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    setUpdatingId(id);

    const { error } = await supabase
      .from('print_orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating order status:', error);
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      );
    }

    setUpdatingId(null);
  };

  const filtered = filter === 'all'
    ? orders
    : orders.filter((o) => o.status === filter);

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  const hasShippingInfo = (order) =>
    order.shipping_address ||
    order.address_line1 ||
    order.address_line2 ||
    order.city ||
    order.state ||
    order.zip ||
    order.country;

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Orders</p>
          <h2>Print orders</h2>
        </div>

        <button type="button" className="ghost" onClick={loadOrders}>
          Refresh
        </button>
      </div>

      <div className="orders-filter-bar">
        <button
          type="button"
          className={`orders-filter-btn${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
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
            {counts[s] > 0 && (
              <span className="orders-count">{counts[s]}</span>
            )}
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
              <div
                className="order-card-header"
                onClick={() =>
                  setExpandedId(expandedId === order.id ? null : order.id)
                }
              >
                <div className="order-card-left">
                  <div className="order-thumb-wrap">
                    <img
                      src={order.image_url}
                      alt={order.image_title || 'Order image'}
                      className="order-thumb"
                    />
                  </div>

                  <div className="order-card-info">
                    <span className="order-image-title">
                      {order.image_title || 'Untitled image'}
                    </span>

                    <span className="order-print-size">
                      {order.print_size_label}
                    </span>

                    <span className="order-customer">
                      {order.customer_name} · {order.customer_email}
                    </span>
                  </div>
                </div>

                <div className="order-card-right">
                  <span className="order-total">
                    ${parseFloat(order.total_price || 0).toFixed(2)}
                  </span>

                  <span
                    className="order-status-badge"
                    style={{
                      background: `${STATUS_COLORS[order.status]}22`,
                      color: STATUS_COLORS[order.status],
                      border: `1px solid ${STATUS_COLORS[order.status]}44`,
                    }}
                  >
                    {order.status}
                  </span>

                  <span className="order-date">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>

                  <span className="order-expand-icon">
                    {expandedId === order.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expandedId === order.id && (
                <div className="order-card-detail">
                  <div className="order-detail-grid">
                    <div>
                      <p className="order-detail-label">Customer</p>
                      <p className="order-detail-val">
                        {order.customer_name || '—'}
                      </p>
                      <p className="order-detail-val">
                        {order.customer_email || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="order-detail-label">Shipping address</p>

                      {hasShippingInfo(order) ? (
                        <address className="order-detail-address">
                          {order.shipping_address && (
                            <p className="order-detail-val">
                              <strong>Full:</strong>{' '}
                              <LongTextReveal
                                label="Full shipping address"
                                value={order.shipping_address}
                                maxLength={42}
                              />
                            </p>
                          )}

                          {order.address_line1 && (
                            <p className="order-detail-val">
                              <strong>Line 1:</strong> {order.address_line1}
                            </p>
                          )}

                          {order.address_line2 && (
                            <p className="order-detail-val">
                              <strong>Line 2:</strong> {order.address_line2}
                            </p>
                          )}

                          {order.city && (
                            <p className="order-detail-val">
                              <strong>City:</strong> {order.city}
                            </p>
                          )}

                          {order.state && (
                            <p className="order-detail-val">
                              <strong>State:</strong> {order.state}
                            </p>
                          )}

                          {order.zip && (
                            <p className="order-detail-val">
                              <strong>ZIP:</strong> {order.zip}
                            </p>
                          )}

                          {order.country && (
                            <p className="order-detail-val">
                              <strong>Country:</strong> {order.country}
                            </p>
                          )}
                        </address>
                      ) : (
                        <p className="order-detail-val">—</p>
                      )}
                    </div>

                    <div>
                      <p className="order-detail-label">Order details</p>

                      <p className="order-detail-val">
                        Qty: {order.quantity || 0}
                      </p>

                      <p className="order-detail-val">
                        Unit: ${parseFloat(order.unit_price || 0).toFixed(2)}
                      </p>

                      <p className="order-detail-val">
                        Total: ${parseFloat(order.total_price || 0).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="order-detail-label">Print</p>

                      <p className="order-detail-val">
                        <strong>Size:</strong> {order.print_size_label || '—'}
                      </p>

                      <p className="order-detail-val">
                        <strong>Image:</strong> {order.image_title || 'Untitled image'}
                      </p>
                    </div>

                    <div>
                      <p className="order-detail-label">Payment</p>

                      <p className="order-detail-val">
                        <strong>Stripe Session:</strong>{' '}
                        <LongTextReveal
                          label="Stripe Session"
                          value={order.stripe_checkout_session_id}
                        />
                      </p>
                    </div>

                    <div>
                      <p className="order-detail-label">Dates</p>

                      <p className="order-detail-val">
                        <strong>Created:</strong>{' '}
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString()
                          : '—'}
                      </p>

                      <p className="order-detail-val">
                        <strong>Updated:</strong>{' '}
                        {order.updated_at
                          ? new Date(order.updated_at).toLocaleString()
                          : '—'}
                      </p>
                    </div>

                    {order.notes && (
                      <div>
                        <p className="order-detail-label">Notes</p>
                        <p className="order-detail-val">
                          <LongTextReveal
                            label="Notes"
                            value={order.notes}
                            maxLength={60}
                          />
                        </p>
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
                          className={`order-status-btn${
                            order.status === s ? ' current' : ''
                          }`}
                          style={
                            order.status === s
                              ? {
                                  background: `${STATUS_COLORS[s]}22`,
                                  color: STATUS_COLORS[s],
                                  border: `1px solid ${STATUS_COLORS[s]}55`,
                                }
                              : {}
                          }
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