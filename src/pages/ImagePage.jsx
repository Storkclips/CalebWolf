import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/StoreContext';
import GalleryLightbox from '../components/GalleryLightbox';
import PrintOrderModal from '../components/PrintOrderModal';

const ImagePage = () => {
  const { imageId } = useParams();
  const navigate = useNavigate();
  const { addToCart, isOwned } = useStore();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printOrderImage, setPrintOrderImage] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('gallery_images')
        .select('*, themes(name, slug)')
        .eq('id', imageId)
        .eq('is_published', true)
        .maybeSingle();

      if (!data) {
        navigate('/explore', { replace: true });
        return;
      }
      setImage(data);
      setLoading(false);
    };
    load();
  }, [imageId, navigate]);

  const handleAdd = () => {
    if (!image) return;
    const result = addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: image.themes?.name ?? 'Gallery',
      preview: image.url,
    });
    if (result?.alreadyOwned) {
      setMessage('You already own this image.');
    } else {
      setMessage('Added to cart');
    }
    setTimeout(() => setMessage(''), 2400);
  };

  if (loading) {
    return (
      <Layout>
        <div className="ss-loading"><div className="ss-spinner" /><p>Loading...</p></div>
      </Layout>
    );
  }

  if (!image) return null;

  // Normalise to the shape GalleryLightbox expects via imageUrlKey="url"
  const lbImage = { id: image.id, url: image.url, title: image.title, price: image.price };

  return (
    <Layout>
      {/* Minimal backdrop so the page feels intentional if lightbox is dismissed */}
      <div className="img-page-bg">
        <div className="img-page-center">
          <div className="img-page-meta">
            <p className="eyebrow">{image.themes?.name}</p>
            <h1 className="img-page-title">{image.title}</h1>
            <p className="muted">{image.price} credits</p>
          </div>
          <div className="img-page-actions">
            {isOwned(image.id) ? (
              <span className="ss-owned-badge">Already owned</span>
            ) : (
              <button className="btn" type="button" onClick={handleAdd}>Add to cart</button>
            )}
            <button
              className="ghost"
              type="button"
              onClick={() => setPrintOrderImage({ id: image.id, title: image.title, url: image.url })}
            >
              Order print
            </button>
            <Link className="ghost" to={image.themes?.slug ? `/collections/${image.themes.slug}` : '/explore'}>
              View collection
            </Link>
          </div>
        </div>
      </div>

      <GalleryLightbox
        image={lbImage}
        imageUrlKey="url"
        imageList={[lbImage]}
        onClose={() => navigate(image.themes?.slug ? `/collections/${image.themes.slug}` : '/explore')}
        meta={`${image.themes?.name ?? 'Gallery'} · ${image.price} credits`}
        footer={
          <>
            {isOwned(image.id) ? (
              <span className="ss-owned-badge">Already owned</span>
            ) : (
              <button className="pill" type="button" onClick={handleAdd}>Add to cart</button>
            )}
            <button
              className="ss-lb-print-btn"
              type="button"
              onClick={() => setPrintOrderImage({ id: image.id, title: image.title, url: image.url })}
            >
              Order print
            </button>
          </>
        }
      />

      {printOrderImage && (
        <PrintOrderModal image={printOrderImage} onClose={() => setPrintOrderImage(null)} />
      )}

      {message && <div className="toast" role="status">{message}</div>}
    </Layout>
  );
};

export default ImagePage;
