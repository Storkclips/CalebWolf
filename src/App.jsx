import { Route, Routes } from 'react-router-dom';
import AboutPage from './pages/AboutPage';
import BlogDetailPage from './pages/BlogDetailPage';
import BlogEditorPage from './pages/BlogEditorPage';
import BlogPage from './pages/BlogPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ClientDownloadsPage from './pages/ClientDownloadsPage';
import CollectionsPage from './pages/CollectionsPage';
import ContactPage from './pages/ContactPage';
import GalleryPage from './pages/GalleryPage';
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import ScrollToTop from './components/ScrollToTop';
import { StoreProvider } from './store/StoreContext';

export default function App() {
  return (
    <StoreProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:collectionId" element={<GalleryPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:postId" element={<BlogDetailPage />} />
        <Route path="/blog/new" element={<BlogEditorPage />} />
        <Route path="/blog/:postId/edit" element={<BlogEditorPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/client-downloads" element={<ClientDownloadsPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </StoreProvider>
  );
}
