import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';

const PrintOrderModal = ({ image, onClose }) => {
  const { profile, user } = useAuth();
  const [printSizes, setPrintSizes] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState(profile?.full_name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('size');

  useEffect(() => {
    supabase
      .from('print_sizes')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('sort_order')
      .then(({ data }) => {
        setPrintSizes(data || []);
        if (data?.length) setSelectedSize(data[0]);
      });
  }, []);

  const totalPrice = selectedSize
    ? parseFloat(selectedSize.base_price) + (quantity - 1) * parseFloat(selectedSize.additional_price)
    : 0;

  const handleSubmit = async () => {
    if (!selectedSize || !customerName || !customerEmail || !shippingAddress) return;
    setSubmitting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('You must be logged in to place an order.');
        setSubmitting(false);
        return;
      }

      const origin = window.location.origin;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-print-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            image_id: image.id || '',
            image_title: image.title || '',
            image_url: image.url || '',
            print_size_id: selectedSize.id,
            print_size_label: `${selectedSize.category} — ${selectedSize.label}`,
            quantity,
            unit_price: parseFloat(selectedSize.base_price),
            total_price: totalPrice,
            customer_name: customerName,
            customer_email: customerEmail,
            shipping_address: shippingAddress,
            notes,
            success_url: `${origin}/print-order-success`,
            cancel_url: window.location.href,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error || 'Failed to start checkout. Please try again.');
        setSubmitting(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const printCategories = [...new Set(printSizes.map((p) => p.category))];

  return (
    <div className="po-overlay" onClick={onClose}>
      <div className="po-modal" onClick={(e) => e.stopPropagation()}>
        <div className="po-modal-header">
          <div className="po-modal-title-row">
            <h2 className="po-modal-title">Order a print</h2>
            <button type="button" className="po-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <p className="po-modal-sub">{image.title}</p>
        </div>

        <div className="po-modal-body">
          <div className="po-preview">
            <img
              src={image.url}
              alt={image.title}
              className="po-preview-img"
              style={{ objectPosition: `${image.focusX ?? 50}% ${image.focusY ?? 50}%` }}
            />
          </div>

          {step === 'size' && (
            <div className="po-step">
              <h3 className="po-step-title">Choose a print size</h3>
              {printCategories.map((cat) => (
                <div key={cat} className="po-size-group">
                  <p className="po-size-cat">{cat}</p>
                  <div className="po-size-options">
                    {printSizes.filter((p) => p.category === cat).map((size) => (
                      <button
                        key={size.id}
                        type="button"
                        className={`po-size-option${selectedSize?.id === size.id ? ' selected' : ''}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        <span className="po-size-option-label">{size.label}</span>
                        <span className="po-size-option-price">${parseFloat(size.base_price).toFixed(2)}</span>
                        {size.additional_price > 0 && (
                          <span className="po-size-option-add">+${parseFloat(size.additional_price).toFixed(2)} ea. additional</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {selectedSize && (
                <div className="po-qty-row">
                  <label className="po-qty-label">Quantity</label>
                  <div className="po-qty-controls">
                    <button type="button" className="po-qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                    <span className="po-qty-val">{quantity}</span>
                    <button type="button" className="po-qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
                  </div>
                  <div className="po-total">
                    Total: <strong>${totalPrice.toFixed(2)}</strong>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="po-next-btn"
                disabled={!selectedSize}
                onClick={() => setStep('details')}
              >
                Continue to details
              </button>
            </div>
          )}

          {step === 'details' && (
            <div className="po-step">
              <button type="button" className="po-back-btn" onClick={() => setStep('size')}>← Back</button>
              <h3 className="po-step-title">Shipping details</h3>
              <div className="po-form">
                <label className="po-form-label">
                  Your name
                  <input
                    className="po-form-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                  />
                </label>
                <label className="po-form-label">
                  Email address
                  <input
                    className="po-form-input"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </label>
                <label className="po-form-label">
                  Shipping address
                  <textarea
                    className="po-form-textarea"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Street, City, State, ZIP"
                    rows={3}
                  />
                </label>
                <label className="po-form-label">
                  Notes (optional)
                  <input
                    className="po-form-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests?"
                  />
                </label>
              </div>

              <div className="po-order-summary">
                <div className="po-summary-row">
                  <span>Print</span>
                  <span>{selectedSize?.category} — {selectedSize?.label}</span>
                </div>
                <div className="po-summary-row">
                  <span>Qty</span>
                  <span>{quantity}</span>
                </div>
                <div className="po-summary-row po-summary-total">
                  <span>Total</span>
                  <strong>${totalPrice.toFixed(2)}</strong>
                </div>
              </div>

              {error && <p className="po-error">{error}</p>}

              <button
                type="button"
                className="po-submit-btn"
                disabled={submitting || !customerName || !customerEmail || !shippingAddress}
                onClick={handleSubmit}
              >
                {submitting ? 'Redirecting to payment...' : 'Pay & place order'}
              </button>
              <p className="po-disclaimer">
                You'll be taken to Stripe's secure checkout. Orders are fulfilled within 3–7 business days.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintOrderModal;
