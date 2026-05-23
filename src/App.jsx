import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './store/AuthContext';
import { StoreProvider } from './store/StoreContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Signup = lazy(() => import('./pages/Signup').then((module) => ({ default: module.Signup })));
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword').then((module) => ({ default: module.ResetPassword }))
);
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const MyLibraryPage = lazy(() => import('./pages/MyLibraryPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogAdminPage = lazy(() => import('./pages/BlogAdminPage'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'));
const BlogEditorPage = lazy(() => import('./pages/BlogEditorPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ClientDownloadsPage = lazy(() => import('./pages/ClientDownloadsPage'));
const BuyCreditsPage = lazy(() => import('./pages/BuyCreditsPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const PrintOrderSuccessPage = lazy(() => import('./pages/PrintOrderSuccessPage'));
const UnlockedGalleryPage = lazy(() => import('./pages/UnlockedGalleryPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));

function RouteFallback() {
  return <div className="loading-state">Loading…</div>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>
          <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
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
              <Route path="/print-order-success" element={<PrintOrderSuccessPage />} />
              <Route path="/unlocked/:collectionId" element={<UnlockedGalleryPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
