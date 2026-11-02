import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SiteIdentityProvider } from './contexts/SiteIdentityContext';
import { SeoProvider, useNoIndex } from './contexts/SeoContext';
import { AuthProvider } from './store/AuthContext';
import { StoreProvider } from './store/StoreContext';
import ScrollToTop from './components/ScrollToTop';

const HomePage = lazy(() => import('./pages/HomePage'));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
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
const BlogStoriesPage = lazy(() => import('./pages/BlogStoriesPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ClientDownloadsPage = lazy(() => import('./pages/ClientDownloadsPage'));
const BuyCreditsPage = lazy(() => import('./pages/BuyCreditsPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const PrintOrderSuccessPage = lazy(() => import('./pages/PrintOrderSuccessPage'));
const UnlockedGalleryPage = lazy(() => import('./pages/UnlockedGalleryPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ImagePage = lazy(() => import('./pages/ImagePage'));
const LicensePage = lazy(() => import('./pages/LicensePage'));
const MagazinesPage = lazy(() => import('./pages/MagazinesPage'));
const MagazinePage = lazy(() => import('./pages/MagazinePage'));
const MagazineStudioPage = lazy(() => import('./pages/MagazineStudioPage'));

// Wrapper for private app areas (accounts, carts, admin tools): keeps them
// out of search results regardless of how a crawler reaches them.
const Private = ({ title, children }) => {
  useNoIndex(title);
  return children;
};

export default function App() {
  return (
    <ThemeProvider>
      <SiteIdentityProvider>
        <SeoProvider>
          <AuthProvider>
            <StoreProvider>
              <ScrollToTop />
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<Private title="Sign in — Caleb Wolf Photography"><Login /></Private>} />
                  <Route path="/signup" element={<Private title="Create an account — Caleb Wolf Photography"><Signup /></Private>} />
                  <Route path="/auth/reset-password" element={<Private title="Reset password — Caleb Wolf Photography"><ResetPassword /></Private>} />
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route path="/collections/:collectionId" element={<GalleryPage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/my-library" element={<Private title="My library — Caleb Wolf Photography"><MyLibraryPage /></Private>} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/admin" element={<Private title="Studio dashboard"><AdminPage /></Private>} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/blog/admin" element={<Private title="Blog admin"><BlogAdminPage /></Private>} />
                  <Route path="/blog/stories" element={<BlogStoriesPage />} />
                  <Route path="/blog/new" element={<Private title="New post — Blog editor"><BlogEditorPage /></Private>} />
                  <Route path="/blog/:postId" element={<BlogDetailPage />} />
                  <Route path="/blog/:postId/edit" element={<Private title="Edit post — Blog editor"><BlogEditorPage /></Private>} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/cart" element={<Private title="Your cart — Caleb Wolf Photography"><CartPage /></Private>} />
                  <Route path="/checkout" element={<Private title="Checkout — Caleb Wolf Photography"><CheckoutPage /></Private>} />
                  <Route path="/client-downloads" element={<Private title="Client downloads — Caleb Wolf Photography"><ClientDownloadsPage /></Private>} />
                  <Route path="/buy-credits" element={<BuyCreditsPage />} />
                  <Route path="/success" element={<Private title="Order confirmed — Caleb Wolf Photography"><SuccessPage /></Private>} />
                  <Route path="/print-order-success" element={<Private title="Print order confirmed — Caleb Wolf Photography"><PrintOrderSuccessPage /></Private>} />
                  <Route path="/unlocked/:collectionId" element={<Private title="Unlocked gallery — Caleb Wolf Photography"><UnlockedGalleryPage /></Private>} />
                  <Route path="/auth" element={<Private title="Sign in — Caleb Wolf Photography"><AuthPage /></Private>} />
                  <Route path="/image/:imageId" element={<ImagePage />} />
                  <Route path="/license" element={<LicensePage />} />
                  <Route path="/magazines" element={<MagazinesPage />} />
                  <Route path="/magazines/:slug" element={<MagazinePage />} />
                  <Route path="/magazine-studio" element={<Private title="Magazine studio"><MagazineStudioPage /></Private>} />
                  <Route path="/magazine-studio/:projectId" element={<Private title="Magazine studio"><MagazineStudioPage /></Private>} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </Suspense>
            </StoreProvider>
          </AuthProvider>
        </SeoProvider>
      </SiteIdentityProvider>
    </ThemeProvider>
  );
}
