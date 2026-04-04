import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';

const PrintOrderSuccessPage = () => {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');

  return (
    <Layout>
      <div className="print-success-page">
        <div className="print-success-card">
          <div className="print-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="40" height="40">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="print-success-title">Order confirmed!</h1>
          <p className="print-success-body">
            Your payment was successful and your print order has been placed. We'll get to work on it right away and reach out when it ships.
          </p>
          {orderId && (
            <p className="print-success-ref">Order reference: <code>{orderId.slice(0, 8).toUpperCase()}</code></p>
          )}
          <div className="print-success-actions">
            <Link to="/collections" className="print-success-btn-primary">Browse more photos</Link>
            <Link to="/contact" className="print-success-btn-ghost">Contact us</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PrintOrderSuccessPage;
