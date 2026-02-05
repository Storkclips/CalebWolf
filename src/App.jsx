import { Route, Routes } from 'react-router-dom';
import AboutPage from './pages/AboutPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import BlogAdminPage from './pages/BlogAdminPage';
import BlogDetailPage from './pages/BlogDetailPage';
import BlogEditorPage from './pages/BlogEditorPage';
import BlogPage from './pages/BlogPage';
import BuyCreditsPage from './pages/BuyCreditsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ClientDownloadsPage from './pages/ClientDownloadsPage';
import CollectionsPage from './pages/CollectionsPage';
import ContactPage from './pages/ContactPage';
import GalleryPage from './pages/GalleryPage';
import ExplorePage from './pages/ExplorePage';
import HomePage from './pages/HomePage';
import MyLibraryPage from './pages/MyLibraryPage';
import PricingPage from './pages/PricingPage';
import SuccessPage from './pages/SuccessPage';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './store/AuthContext';
import { StoreProvider } from './store/StoreContext';

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:collectionId" element={<GalleryPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/my-library" element={<MyLibraryPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/admin" element={<BlogAdminPage />} />
          <Route path="/blog/:postId" element={<BlogDetailPage />} />
          <Route path="/blog/new" element={<BlogEditorPage />} />
          <Route path="/blog/:postId/edit" element={<BlogEditorPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/client-downloads" element={<ClientDownloadsPage />} />
          <Route path="/buy-credits" element={<BuyCreditsPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </StoreProvider>
    </AuthProvider>
  );
}
