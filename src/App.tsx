import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { StoreProvider, useStore, ADMIN_PORTAL_PATH } from './context/StoreContext';

// ── Storefront imports ──────────────────────────────────────────────────────
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { MobileTabBar } from './components/common/MobileTabBar';
import { Toast } from './components/common/Toast';
import { CartDrawer } from './components/storefront/CartDrawer';
import { HeroBanner } from './components/storefront/HeroBanner';
import { TrustStrip } from './components/storefront/TrustStrip';
import { CategoryGrid } from './components/storefront/CategoryGrid';
import { FeaturedProductsSection } from './components/storefront/FeaturedProductsSection';
import { BrandStorySection } from './components/storefront/BrandStorySection';
import { TestimonialsSection } from './components/storefront/TestimonialsSection';
import { HomeFaqSection } from './components/storefront/HomeFaqSection';
import { ShopView } from './components/storefront/ShopView';
import { CheckoutView } from './components/storefront/CheckoutView';
import { OrderConfirmationView } from './components/storefront/OrderConfirmationView';
import { TrackOrderView } from './components/storefront/TrackOrderView';
import { LandingPageView } from './components/storefront/LandingPageView';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { PageTransition, ScrollProgress } from './components/motion';

// ── Admin imports (only rendered on admin portal route) ─────────────────────
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminProducts } from './components/admin/AdminProducts';
import { AdminCategories } from './components/admin/AdminCategories';
import { AdminInventory } from './components/admin/AdminInventory';
import { AdminCustomers } from './components/admin/AdminCustomers';
import { AdminDeliveryZones } from './components/admin/AdminDeliveryZones';
import { AdminSalesMarketing } from './components/admin/AdminSalesMarketing';
import { AdminReviews } from './components/admin/AdminReviews';
import { AdminSettings } from './components/admin/AdminSettings';
import { AdminSupport } from './components/admin/AdminSupport';

import { SupportWidget } from './components/support/SupportWidget';
import { Product } from './types';

// ── Admin Portal (served at ADMIN_PORTAL_PATH) ───────────────────────────────
// Completely separate from storefront — regular users never see this component.
const AdminAppContent: React.FC = () => {
  const { adminUser, settings } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const escapedBase = ADMIN_PORTAL_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tabFromPath = location.pathname.match(new RegExp(`^${escapedBase}/(.+)$`))?.[1];
  const [adminTab, setAdminTabState] = useState<string>(tabFromPath || 'dashboard');
  const setAdminTab = (tab: string) => {
    setAdminTabState(tab);
    navigate(tab === 'dashboard' ? ADMIN_PORTAL_PATH : `${ADMIN_PORTAL_PATH}/${tab}`);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [adminTab]);

  // Admin tab title + tab icon (storefront uses the 16x16 PNG, admin uses
  // the 32x32 PNG — both panels share one document head, only these differ).
  // Skipped when a custom (non-default) favicon is configured.
  useEffect(() => {
    const label = adminTab
      .split('-')
      .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
    const fallback = 'GoodZeed — 100% Pure Natural Food Store Bangladesh';
    document.title = adminUser
      ? `${label} | GoodZeed Admin`
      : `GoodZeed Admin Login | GoodZeed`;
    const ogTitle = document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]'
    );
    if (ogTitle) ogTitle.content = document.title;

    const ADMIN_TAB_ICON = '/favicon-32x32.png?v=5';
    const STOREFRONT_TAB_ICON = '/favicon-16x16.png?v=5';
    const isDefaultFamily = /favicon/i.test(settings.faviconPath || '');
    if (isDefaultFamily) {
      document
        .querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']")
        .forEach(link => {
          link.href = ADMIN_TAB_ICON;
          link.type = 'image/png';
        });
    }
    return () => {
      document.title = fallback;
      const og = document.querySelector<HTMLMetaElement>(
        'meta[property="og:title"]'
      );
      if (og) og.content = fallback;
      if (isDefaultFamily) {
        // Restore the storefront icon set (16x16 tab icon + per-size assets).
        const ICO = '/favicon.ico?v=5';
        document
          .querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']")
          .forEach(link => {
            const sizes = (link.getAttribute('sizes') || '').trim();
            const rel = (link.getAttribute('rel') || '').toLowerCase();
            if (rel.includes('shortcut')) {
              link.href = STOREFRONT_TAB_ICON;
              link.type = 'image/png';
            } else if (sizes === '32x32') {
              link.href = ADMIN_TAB_ICON;
              link.type = 'image/png';
            } else if (sizes === '16x16') {
              link.href = STOREFRONT_TAB_ICON;
              link.type = 'image/png';
            } else if ((link.getAttribute('type') || '').includes('x-icon')) {
              link.href = ICO;
              link.type = 'image/x-icon';
            } else {
              link.href = '/favicon.png?v=5';
              link.type = 'image/png';
            }
          });
      }
    };
  }, [adminTab, adminUser, settings.faviconPath]);

  // Gate: unauthenticated users see only the login screen
  if (!adminUser) {
    return (
      <>
        <AdminLogin />
        <Toast />
      </>
    );
  }

  return (
    <>
      <AdminLayout activeTab={adminTab} setActiveTab={setAdminTab}>
        {adminTab === 'dashboard' && <AdminDashboard onNavigate={setAdminTab} />}
        {adminTab === 'orders' && <AdminOrders />}
        {adminTab === 'products' && <AdminProducts />}
        {adminTab === 'categories' && <AdminCategories />}
        {adminTab === 'inventory' && <AdminInventory />}
        {adminTab === 'customers' && <AdminCustomers />}
        {adminTab === 'delivery' && <AdminDeliveryZones />}
        {adminTab === 'sales-marketing' && <AdminSalesMarketing />}
        {adminTab === 'homepage' && <AdminSalesMarketing defaultTab="hero" />}
        {adminTab === 'landing' && <AdminSalesMarketing defaultTab="campaigns" />}
        {adminTab === 'reviews' && <AdminReviews />}
        {adminTab === 'support' && <AdminSupport />}
        {adminTab === 'settings' && <AdminSettings />}
      </AdminLayout>
      <Toast />
    </>
  );
};

// ── Storefront (served at /*) ───────────────────────────────────────────────
// Zero admin references — regular users cannot reach admin UI from here.
const StorefrontAppContent: React.FC = () => {
  const { currentView, homepageSections, setCurrentView, setSelectedLandingSlug, categories } = useStore();
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);

  // Derive product context for SupportWidget (passed down when a product modal is open)
  const productContext = activeModalProduct ? {
    productId: activeModalProduct.id,
    productName: activeModalProduct.name,
    categoryName: categories.find(c => c.id === activeModalProduct.categoryId)?.name
  } : null;

  // Derive support page context from current view
  const supportPageContext: 'checkout' | 'product' | 'order' | 'general' =
    currentView === 'checkout' ? 'checkout' :
    activeModalProduct ? 'product' :
    currentView === 'track-order' || currentView === 'confirmation' ? 'order' :
    'general';

  // Navigate to a campaign page, respecting the section's CTA link slug
  // (e.g. ctaLink "/landing/energy-nut-mix-40tk" opens that campaign,
  // not whatever landing page happens to be first/published).
  const goToCampaign = (ctaLink?: string) => {
    const slug = ctaLink?.match(/\/landing\/([\w-]+)/)?.[1] || null;
    if (slug) setSelectedLandingSlug(slug);
    setCurrentView('landing');
  };

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Render CMS-configured homepage sections in priority order
  const renderHomeSections = () => {
    const sorted = [...homepageSections]
      .filter(s => s.isEnabled)
      .sort((a, b) => {
        const getPriority = (secType: string) => {
          if (secType === 'HERO') return 1;
          if (secType === 'SHOP_BY_CATEGORY' || secType === 'CATEGORIES') return 2;
          if (secType === 'TRUST_STRIP') return 3;
          if (secType === 'FEATURED_PRODUCTS' || secType === 'BEST_SELLERS') return 4;
          return 10;
        };
        const pA = getPriority(a.sectionType);
        const pB = getPriority(b.sectionType);
        if (pA !== 10 || pB !== 10) return pA - pB;
        return a.sortOrder - b.sortOrder;
      });

    return sorted.map(sec => {
      if (sec.customHtml) {
        return (
          <section
            key={sec.id}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
            dangerouslySetInnerHTML={{ __html: sec.customHtml }}
          />
        );
      }
      switch (sec.sectionType) {
        case 'HERO':
          return <HeroBanner key={sec.id} />;
        case 'SHOP_BY_CATEGORY':
        case 'CATEGORIES':
          return <CategoryGrid key={sec.id} />;
        case 'TRUST_STRIP':
          return <TrustStrip key={sec.id} />;
        case 'FEATURED_PRODUCTS':
        case 'BEST_SELLERS':
          return (
            <FeaturedProductsSection
              key={sec.id}
              onOpenDetail={p => setActiveModalProduct(p)}
            />
          );
        case 'PROMO_BANNER':
          return (
            <div key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="relative rounded-3xl overflow-hidden bg-[#2F5233] text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
                <div className="space-y-2.5 max-w-xl text-center md:text-left">
                  <span className="px-3 py-1 bg-[#D9A441] text-[#2A2A28] rounded-full text-[11px] font-bold uppercase tracking-wider">
                    Seasonal Harvest
                  </span>
                  <h3 className="font-serif-brand font-bold text-xl sm:text-2xl text-[#FAF7F2]">
                    {sec.heading}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-200/90 leading-relaxed">
                    {sec.bodyText}
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => goToCampaign(sec.ctaLink)}
                      className="px-5 py-2 bg-[#D9A441] hover:bg-[#e2b04f] text-[#2A2A28] font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all"
                    >
                      {sec.ctaLabel || 'View Campaign & Buy'}
                    </button>
                  </div>
                </div>
                {sec.mediaUrl && (
                  <div className="w-full md:w-72 h-44 rounded-2xl overflow-hidden shadow-md shrink-0">
                    <img
                      src={sec.mediaUrl}
                      alt={sec.heading || ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        case 'BRAND_STORY':
        case 'WHY_GOODZEED':
        case 'SOURCE_STORY':
          return <BrandStorySection key={sec.id} />;
        case 'TESTIMONIALS':
        case 'REVIEWS':
          return <TestimonialsSection key={sec.id} />;
        case 'FAQ':
          return <HomeFaqSection key={sec.id} />;
        default:
          return null;
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2A2A28] font-sans antialiased pb-16 lg:pb-0 overflow-x-hidden pt-[104px]">
      {/* Fixed smart-scroll header */}
      <ScrollProgress />
      <Header />

      {/* Main Content Area — clean page-transition layout */}
      <main className="flex-1">
        <PageTransition viewKey={currentView}>
          {currentView === 'home' && <>{renderHomeSections()}</>}
          {(currentView === 'shop' || currentView === 'category') && <ShopView />}
          {currentView === 'checkout' && <CheckoutView />}
          {currentView === 'confirmation' && <OrderConfirmationView />}
          {currentView === 'track-order' && <TrackOrderView />}
          {currentView === 'landing' && (
            <LandingPageView onOpenProductModal={p => setActiveModalProduct(p)} />
          )}
        </PageTransition>
      </main>

      <Footer />
      <CartDrawer />
      <MobileTabBar />

      <AnimatePresence>
        {activeModalProduct && (
          <ProductDetailModal
            key={activeModalProduct.id}
            product={activeModalProduct}
            onClose={() => setActiveModalProduct(null)}
          />
        )}
      </AnimatePresence>

      <Toast />

      {/* Floating Support Widget — available on all storefront views */}
      <SupportWidget
        productContext={productContext}
        pageContext={supportPageContext}
      />
    </div>
  );
};

// ── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          {/* Admin panel — separate route, never rendered in storefront */}
          <Route path={`${ADMIN_PORTAL_PATH}/*`} element={<AdminAppContent />} />
          {/* Public storefront — no admin components at all */}
          <Route path="/*" element={<StorefrontAppContent />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
