import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';

const SuccessPage = () => {
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshProfile();
    }, 2000);
    return () => clearTimeout(timer);
  }, [refreshProfile]);

  return (
    <Layout>
      <section className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-header">
            <h1>Payment Successful</h1>
            <p className="lead">
              Your credits have been added to your account. They may take a moment to appear.
            </p>
          </div>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <Link to="/collections" className="btn">
              Browse Collections
            </Link>
            <Link to="/buy-credits" className="ghost">
              Buy More Credits
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SuccessPage;
