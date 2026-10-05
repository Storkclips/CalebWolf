import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import '../styles/magazineStudio.css';

export default function MagazineStudioPage() {
  const frameRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) {
      navigate('/');
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (loading || !user || !profile?.is_admin) {
    return (
      <main className="magazine-studio-page">
        <div className="magazine-studio-loading">Checking access…</div>
      </main>
    );
  }

  return (
    <main className="magazine-studio-page">
      <div className="magazine-studio-sitebar">
        <Link to="/admin" className="magazine-studio-sitebar__link">
          ← Admin Dashboard
        </Link>
        <span>Magazine Studio</span>
        <Link to="/" className="magazine-studio-sitebar__link">
          Site Home
        </Link>
      </div>

      {!loaded ? (
        <div className="magazine-studio-loading">Loading Magazine Studio…</div>
      ) : null}

      <iframe
        ref={frameRef}
        className={`magazine-studio-frame${loaded ? ' is-loaded' : ''}`}
        src="/magazine-studio/editor.html?embedded=1"
        title="Magazine Studio"
        onLoad={() => setLoaded(true)}
        allow="clipboard-read; clipboard-write; fullscreen"
      />
    </main>
  );
}
