import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { LandingPage, Product, ProductVariant } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  ShieldCheck,
  CheckCircle2,
  Zap,
  ShoppingBag,
  HelpCircle,
  Star,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Quote,
  Minus,
  Plus
} from 'lucide-react';

interface LandingPageViewProps {
  slug?: string;
  onOpenProductModal?: (product: Product) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ slug, onOpenProductModal }) => {
  const {
    landingPages,
    products,
    settings,
    addToCart,
    setBuyNowItem,
    setCheckoutPrefill,
    setCurrentView,
    selectedLandingSlug
  } = useStore();

  const targetSlug = slug || selectedLandingSlug || 'pure-sundarban-honey';

  const page: LandingPage | undefined =
    landingPages.find(p => p.slug === targetSlug && p.isPublished) ||
    landingPages.find(p => p.slug === targetSlug) ||
    landingPages.find(p => p.isPublished) ||
    landingPages[0];

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [purchaseQty, setPurchaseQty] = useState<number>(1);

  // Quick Order Form state
  const [qofName, setQofName] = useState('');
  const [qofPhone, setQofPhone] = useState('');
  const [qofAddress, setQofAddress] = useState('');
  const [qofVariantId, setQofVariantId] = useState('');
  const [qofQty, setQofQty] = useState<number>(1);
  const [qofSubmitted, setQofSubmitted] = useState(false);

  // Countdown timer
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Inject tracking scripts (FB Pixel, GA) scoped to this landing page
  useEffect(() => {
    if (!page) return;
    const scripts: HTMLScriptElement[] = [];

    // Facebook Pixel
    if (page.facebookPixelId) {
      const fbScript = document.createElement('script');
      fbScript.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${page.facebookPixelId}');fbq('track','PageView');`;
      document.head.appendChild(fbScript);
      scripts.push(fbScript);
    }

    // Google Analytics (GA4)
    if (page.googleAnalyticsId) {
      const gaId = page.googleAnalyticsId;
      const gaTag = document.createElement('script');
      gaTag.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      gaTag.async = true;
      document.head.appendChild(gaTag);
      scripts.push(gaTag);

      const gaInit = document.createElement('script');
      gaInit.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
      document.head.appendChild(gaInit);
      scripts.push(gaInit);
    }

    // SEO meta tags
    const metaTags: HTMLMetaElement[] = [];
    const previousTitle = document.title;
    const fallbackTitle =
      settings.defaultSeoTitle || settings.storeName || 'GoodZeed';
    if (page.seoTitle) {
      document.title = page.seoTitle;
      const ogTitle = document.querySelector<HTMLMetaElement>(
        'meta[property="og:title"]'
      );
      if (ogTitle) ogTitle.content = page.seoTitle;
    }
    if (page.seoDescription) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = page.seoDescription;
      document.head.appendChild(meta);
      metaTags.push(meta);
    }
    if (page.socialShareImage) {
      const og = document.createElement('meta');
      og.setAttribute('property', 'og:image');
      og.content = page.socialShareImage;
      document.head.appendChild(og);
      metaTags.push(og);
    }

    return () => {
      scripts.forEach(s => s.parentNode?.removeChild(s));
      metaTags.forEach(m => m.parentNode?.removeChild(m));
      // Restore the storefront default tab title when leaving a campaign page.
      // Without this, the campaign seoTitle stays stuck on home/shop/checkout.
      document.title = previousTitle || fallbackTitle;
      const ogTitle = document.querySelector<HTMLMetaElement>(
        'meta[property="og:title"]'
      );
      if (ogTitle) ogTitle.content = document.title;
    };
  }, [page?.id, settings.defaultSeoTitle, settings.storeName]);

  // Countdown tick
  useEffect(() => {
    // Find first countdown block endsAt or page-level countdownEndsAt
    const countdownBlock = page?.blocks.find(b => b.blockType === 'COUNTDOWN_TIMER');
    const endsAtStr = countdownBlock?.content?.endsAt || page?.countdownEndsAt;
    if (!endsAtStr) return;

    const target = new Date(endsAtStr).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [page?.id]);

  if (!page) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <h2 className="font-serif-brand text-2xl font-bold text-[#2F5233]">
          Campaign Page Not Found
        </h2>
        <p className="text-xs text-neutral-500 mt-2">
          This campaign may have ended or is temporarily unpublished.
        </p>
        <button
          onClick={() => setCurrentView('shop')}
          className="mt-4 px-6 py-2 bg-[#2F5233] text-white text-xs font-bold rounded-xl"
        >
          View All Products
        </button>
      </div>
    );
  }

  const hasHeroBlock = page.blocks.some(b => b.blockType === 'HERO');

  return (
    <div className="bg-[#FAF7F2] min-h-screen">
      {!hasHeroBlock && (
        <section className="relative bg-gradient-to-b from-[#2F5233] to-[#243F27] text-white py-16 sm:py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <span className="inline-flex items-center gap-1.5 bg-[#D9A441] text-[#2A2A28] text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Special Harvest Campaign
                </span>
                <h1 className="font-serif-brand text-3xl sm:text-5xl font-extrabold text-white leading-tight">
                  {page.title}
                </h1>
                <p className="text-sm sm:text-lg text-white/85 max-w-xl leading-relaxed">
                  {page.seoDescription || '100% Raw, Lab-Tested Pure Natural Food Delivered Nationwide.'}
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-bold text-white/90">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#D9A441]" /> 100% Raw & Unheated
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#D9A441]" /> Free Delivery in Dhaka
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#D9A441]" /> Cash on Delivery
                  </span>
                </div>
                <div>
                  <a
                    href="#landing-purchase-section"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#D9A441] hover:bg-[#e2ad4a] text-[#2A2A28] font-black text-sm rounded-2xl shadow-xl transition-all hover:scale-105"
                  >
                    <span>Order Now with Cash on Delivery</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
                  <img
                    src={page.socialShareImage || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80'}
                    alt={page.title}
                    className="w-full h-80 sm:h-96 object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {page.blocks
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(block => {
          switch (block.blockType) {
            case 'HERO': {
              const c = block.content || {};
              const badge = c.badge || 'Special Promo';
              const heading = c.heading || c.heroHeadline || c.title || page.title || 'Special Campaign';
              const subheading = c.subheading || c.heroDescription || c.description || c.bodyText || page.seoDescription || '';
              const ctaText = c.ctaText || c.ctaLabel || 'Order Now with Cash on Delivery';
              const imageUrl = c.imageUrl || c.mediaUrl || c.image || page.socialShareImage || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1200&q=80';

              return (
                <section
                  key={block.id}
                  className="relative bg-gradient-to-b from-[#2F5233] to-[#243F27] text-white py-16 sm:py-24 overflow-hidden"
                >
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                      <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                        {badge && (
                          <span className="inline-flex items-center gap-1.5 bg-[#D9A441] text-[#2A2A28] text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5" />
                            {badge}
                          </span>
                        )}

                        <h1 className="font-serif-brand text-3xl sm:text-5xl font-extrabold text-white leading-tight">
                          {heading}
                        </h1>

                        <p className="text-sm sm:text-lg text-white/85 max-w-xl leading-relaxed">
                          {subheading}
                        </p>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-bold text-white/90">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#D9A441]" /> 100% Raw & Unheated
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#D9A441]" /> Free Delivery in Dhaka
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#D9A441]" /> Cash on Delivery
                          </span>
                        </div>

                        <div>
                          <a
                            href="#landing-purchase-section"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-[#D9A441] hover:bg-[#e2ad4a] text-[#2A2A28] font-black text-sm rounded-2xl shadow-xl transition-all hover:scale-105"
                          >
                            <span>{ctaText}</span>
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      <div className="lg:col-span-5">
                        <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
                          <img
                            src={imageUrl}
                            alt="Campaign Hero"
                            className="w-full h-80 sm:h-96 object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            case 'BENEFITS': {
              const { heading, items = [] } = block.content;
              return (
                <section key={block.id} className="py-14 sm:py-20 bg-white border-b border-neutral-200">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441]">
                        Uncompromised Quality
                      </span>
                      <h2 className="font-serif-brand text-2xl sm:text-4xl font-extrabold text-[#2F5233] mt-1">
                        {heading || 'The GoodZeed Difference'}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {items.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#2F5233]/15 space-y-3"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#2F5233] text-[#D9A441] flex items-center justify-center font-bold">
                            0{idx + 1}
                          </div>
                          <h3 className="font-serif-brand font-bold text-base text-[#2F5233]">
                            {item.title}
                          </h3>
                          <p className="text-xs text-neutral-600 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            case 'PURCHASE_SECTION': {
              const { productId, heading, subheading } = block.content;
              const product = products.find(p => p.id === productId) || products[0];

              if (!product) return null;

              const enabledVariants = product.variants.filter(v => v.isEnabled);
              const activeVarId = selectedVariantId || enabledVariants[0]?.id;
              const currentVariant =
                enabledVariants.find(v => v.id === activeVarId) || enabledVariants[0];

              const price =
                currentVariant?.salePrice != null && currentVariant.salePrice > 0
                  ? currentVariant.salePrice
                  : currentVariant?.price || 0;

              return (
                <section
                  id="landing-purchase-section"
                  key={block.id}
                  className="py-16 sm:py-24 bg-[#FAF7F2]"
                >
                  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-[#2F5233]/20 shadow-2xl space-y-8">
                      <div className="text-center space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441]">
                          Order Directly (Guest Checkout)
                        </span>
                        <h2 className="font-serif-brand text-2xl sm:text-3xl font-extrabold text-[#2F5233]">
                          {heading || 'Select Your Size & Place Order'}
                        </h2>
                        <p className="text-xs text-neutral-500">
                          {subheading || 'No account required. Pay Cash on Delivery upon inspection.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                        {/* Product Photo */}
                        <div className="md:col-span-5">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full aspect-square object-cover rounded-2xl border"
                          />
                        </div>

                        {/* Order Controls */}
                        <div className="md:col-span-7 space-y-5">
                          <div>
                            <h3 className="font-serif-brand font-bold text-xl text-[#2A2A28]">
                              {product.name}
                            </h3>
                            <p className="text-xs text-neutral-600 mt-1">
                              {product.shortDescription}
                            </p>
                          </div>

                          {/* Variant Pills */}
                          <div>
                            <label className="text-xs font-bold uppercase text-neutral-500 block mb-2">
                              Choose Pack Size ({enabledVariants.length} options):
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                              {enabledVariants.map(v => {
                                const vPrice = v.salePrice != null && v.salePrice > 0 ? v.salePrice : v.price;
                                const savings = v.salePrice != null && v.salePrice > 0 ? v.price - v.salePrice : 0;
                                return (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => { setSelectedVariantId(v.id); setPurchaseQty(1); }}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                      activeVarId === v.id
                                        ? 'border-[#2F5233] bg-[#2F5233] text-white shadow-xs'
                                        : 'border-neutral-200 bg-[#FAF7F2] text-[#2A2A28]'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="font-bold text-xs">{v.label}</div>
                                      {savings > 0 && (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeVarId === v.id ? 'bg-[#D9A441] text-[#2A2A28]' : 'bg-[#D9A441]/20 text-[#2A2A28]'}`}>
                                          Save {formatCurrency(savings)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs opacity-90 mt-0.5">
                                      {formatCurrency(vPrice)}
                                      <span className="opacity-70"> • Stock: {v.stock}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Quantity Stepper */}
                          <div>
                            <label className="text-xs font-bold uppercase text-neutral-500 block mb-2">
                              Packet Amount:
                            </label>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setPurchaseQty(q => Math.max(1, q - 1))}
                                disabled={purchaseQty <= 1}
                                className="w-10 h-10 rounded-xl border border-neutral-300 flex items-center justify-center hover:bg-[#FAF7F2] disabled:opacity-40 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="min-w-12 text-center font-black text-lg text-[#2F5233]">
                                {purchaseQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPurchaseQty(q => Math.min(currentVariant?.stock || 99, q + 1))}
                                disabled={purchaseQty >= (currentVariant?.stock || 99)}
                                className="w-10 h-10 rounded-xl border border-neutral-300 flex items-center justify-center hover:bg-[#FAF7F2] disabled:opacity-40 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <span className="text-[11px] text-neutral-500">
                                {purchaseQty} × {currentVariant?.label} = <b className="text-[#2F5233]">{formatCurrency(price * purchaseQty)}</b>
                              </span>
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className="flex items-baseline justify-between border-t border-neutral-100 pt-4">
                            <div>
                              <span className="text-xs text-neutral-400 block">Payable Price:</span>
                              <span className="font-serif-brand font-extrabold text-3xl text-[#2F5233]">
                                {formatCurrency(price * purchaseQty)}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-[#2F5233]">
                              In Stock ({currentVariant?.stock}) • Cash on Delivery
                            </span>
                          </div>

                          {/* Express Buy Now */}
                          <button
                            onClick={() => {
                              if (currentVariant) {
                                setBuyNowItem({
                                  productId: product.id,
                                  variantId: currentVariant.id,
                                  productName: product.name,
                                  variantLabel: currentVariant.label,
                                  unitPrice: price,
                                  quantity: purchaseQty,
                                  image: product.images[0] || '',
                                  stock: currentVariant.stock
                                });
                                setCurrentView('checkout');
                              }
                            }}
                            className="w-full py-4 px-6 rounded-2xl bg-[#2F5233] hover:bg-[#3D6B45] text-white font-bold text-base flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all"
                          >
                            <Zap className="w-5 h-5 text-[#D9A441]" />
                            <span>Buy {purchaseQty} Pack{ purchaseQty > 1 ? 's' : ''} with COD ({formatCurrency(price * purchaseQty)})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            case 'FAQ': {
              const { heading, faqs = [] } = block.content;
              return (
                <section key={block.id} className="py-14 bg-white border-t border-neutral-200">
                  <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441]">
                        Clear Answers
                      </span>
                      <h2 className="font-serif-brand text-2xl sm:text-3xl font-extrabold text-[#2F5233] mt-1">
                        {heading || 'Frequently Asked Questions'}
                      </h2>
                    </div>

                    <div className="space-y-3">
                      {faqs.map((faq: any, idx: number) => {
                        const isOpen = expandedFaq === idx;
                        return (
                          <div
                            key={idx}
                            className="rounded-2xl border border-neutral-200 overflow-hidden"
                          >
                            <button
                              onClick={() => setExpandedFaq(isOpen ? null : idx)}
                              className="w-full text-left p-4 sm:p-5 flex items-center justify-between font-bold text-xs sm:text-sm text-[#2A2A28] bg-[#FAF7F2] hover:bg-[#F3EDE3] transition-colors"
                            >
                              <span>{faq.q}</span>
                              <ChevronDown
                                className={`w-4 h-4 text-[#2F5233] transition-transform ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div className="p-4 sm:p-5 text-xs text-neutral-600 bg-white border-t border-neutral-100 leading-relaxed">
                                {faq.a}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            }

            case 'CUSTOM_HTML': {
              if (!block.sanitizedHtml) return null;
              return (
                <section key={block.id} className="py-10">
                  <div
                    className="max-w-5xl mx-auto px-4"
                    dangerouslySetInnerHTML={{ __html: block.sanitizedHtml }}
                  />
                </section>
              );
            }

            case 'COUNTDOWN_TIMER': {
              const { heading, subtext } = block.content;
              return (
                <section key={block.id} className="py-14 sm:py-20 bg-gradient-to-b from-[#2F5233] to-[#1D3A21] text-white">
                  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Clock className="w-8 h-8 text-[#D9A441] mx-auto mb-4" />
                    <h2 className="font-serif-brand text-2xl sm:text-4xl font-extrabold text-white mb-8">
                      {heading || 'Offer Ends In:'}
                    </h2>
                    <div className="flex items-center justify-center gap-3 sm:gap-5">
                      {[
                        { label: 'Days', value: countdown.days },
                        { label: 'Hours', value: countdown.hours },
                        { label: 'Mins', value: countdown.minutes },
                        { label: 'Secs', value: countdown.seconds },
                      ].map((unit, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#D9A441]">
                              {String(unit.value).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs font-bold text-white/60 mt-1.5 uppercase tracking-wider">
                            {unit.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    {subtext && (
                      <p className="text-xs sm:text-sm text-white/70 mt-6 max-w-xl mx-auto">{subtext}</p>
                    )}
                  </div>
                </section>
              );
            }

            case 'TESTIMONIALS': {
              const { heading, items = [] } = block.content;
              return (
                <section key={block.id} className="py-14 sm:py-20 bg-white border-y border-neutral-200">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441]">Real Stories</span>
                      <h2 className="font-serif-brand text-2xl sm:text-4xl font-extrabold text-[#2F5233] mt-1">
                        {heading || 'What Our Customers Say'}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {(items as { name: string; rating: number; text: string; location: string }[]).map((t, idx) => (
                        <div key={idx} className="bg-[#FAF7F2] rounded-2xl p-6 border border-[#2F5233]/10 shadow-xs space-y-3 relative">
                          <Quote className="w-6 h-6 text-[#D9A441]/30 absolute top-4 right-4" />
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-4 h-4 ${s <= t.rating ? 'text-[#D9A441] fill-[#D9A441]' : 'text-neutral-300'}`} />
                            ))}
                          </div>
                          <p className="text-xs text-neutral-700 leading-relaxed italic">"{t.text}"</p>
                          <div className="flex items-center gap-2 pt-2 border-t border-neutral-200">
                            <div className="w-8 h-8 rounded-full bg-[#2F5233] text-white flex items-center justify-center font-bold text-xs">
                              {t.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-[#2A2A28]">{t.name}</div>
                              {t.location && (
                                <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" /> {t.location}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            case 'QUICK_ORDER_FORM': {
              const { heading, productId, ctaText } = block.content;
              const product = products.find(p => p.id === productId) || products[0];
              if (!product) return null;
              const enabledVariants = product.variants.filter(v => v.isEnabled);
              const activeVar = enabledVariants.find(v => v.id === qofVariantId) || enabledVariants[0];
              const qofPrice = activeVar ? (activeVar.salePrice != null && activeVar.salePrice > 0 ? activeVar.salePrice : activeVar.price) : 0;
              const qofMaxStock = activeVar?.stock || 99;

              const handleQuickOrder = (e: React.FormEvent) => {
                e.preventDefault();
                if (!activeVar || !qofName.trim() || !qofPhone.trim() || !qofAddress.trim()) return;
                const price = activeVar.salePrice != null && activeVar.salePrice > 0 ? activeVar.salePrice : activeVar.price;
                const qty = Math.max(1, Math.min(qofQty, activeVar.stock));
                // Carry customer details into checkout so it opens pre-filled, not empty
                setCheckoutPrefill({ name: qofName.trim(), phone: qofPhone.trim(), address: qofAddress.trim() });
                setBuyNowItem({
                  productId: product.id,
                  variantId: activeVar.id,
                  productName: product.name,
                  variantLabel: activeVar.label,
                  unitPrice: price,
                  quantity: qty,
                  image: product.images[0] || '',
                  stock: activeVar.stock,
                });
                setCurrentView('checkout');
                setQofSubmitted(true);
              };

              if (qofSubmitted) {
                return (
                  <section key={block.id} className="py-16 bg-[#2F5233] text-white text-center">
                    <CheckCircle2 className="w-12 h-12 text-[#D9A441] mx-auto mb-4" />
                    <h2 className="font-serif-brand text-2xl font-bold">Redirecting to Checkout...</h2>
                    <p className="text-xs text-white/70 mt-2">Your order is being prepared.</p>
                  </section>
                );
              }

              return (
                <section key={block.id} className="py-14 sm:py-20 bg-gradient-to-b from-[#FAF7F2] to-white">
                  <div className="max-w-lg mx-auto px-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#2F5233]/15 shadow-2xl space-y-5">
                      <div className="text-center">
                        <ShoppingBag className="w-8 h-8 text-[#2F5233] mx-auto mb-2" />
                        <h2 className="font-serif-brand text-xl sm:text-2xl font-extrabold text-[#2F5233]">
                          {heading || 'Order Directly'}
                        </h2>
                        <p className="text-xs text-neutral-500 mt-1">No account needed. Cash on Delivery.</p>
                      </div>

                      <form onSubmit={handleQuickOrder} className="space-y-3 text-xs">
                        <div>
                          <label className="block font-bold mb-1 text-neutral-600">Product</label>
                          <div className="p-3 bg-[#FAF7F2] rounded-xl border">
                            <div className="font-bold text-sm text-[#2A2A28]">{product.name}</div>
                          </div>
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-neutral-600">Pack Size ({enabledVariants.length} options)</label>
                          <div className="grid grid-cols-1 gap-2">
                            {enabledVariants.map(v => {
                              const vp = v.salePrice != null && v.salePrice > 0 ? v.salePrice : v.price;
                              const save = v.salePrice != null && v.salePrice > 0 ? v.price - v.salePrice : 0;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => { setQofVariantId(v.id); setQofQty(1); }}
                                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                                    (qofVariantId || enabledVariants[0]?.id) === v.id
                                      ? 'border-[#2F5233] bg-[#2F5233] text-white'
                                      : 'border-neutral-200 bg-[#FAF7F2]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-bold">{v.label}</div>
                                    {save > 0 && (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#D9A441] text-[#2A2A28]">
                                        Save {formatCurrency(save)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="opacity-80">{formatCurrency(vp)} • Stock: {v.stock}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-neutral-600">Packet Amount</label>
                          <div className="flex items-center gap-3 bg-[#FAF7F2] border rounded-xl p-2">
                            <button
                              type="button"
                              onClick={() => setQofQty(q => Math.max(1, q - 1))}
                              disabled={qofQty <= 1}
                              className="w-9 h-9 rounded-lg border border-neutral-300 bg-white flex items-center justify-center disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="min-w-10 text-center font-black text-base text-[#2F5233]">{qofQty}</span>
                            <button
                              type="button"
                              onClick={() => setQofQty(q => Math.min(qofMaxStock, q + 1))}
                              disabled={qofQty >= qofMaxStock}
                              className="w-9 h-9 rounded-lg border border-neutral-300 bg-white flex items-center justify-center disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <span className="text-[11px] text-neutral-500 ml-auto">
                              Total: <b className="text-[#2F5233]">{formatCurrency(qofPrice * qofQty)}</b>
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-neutral-600">Your Name</label>
                          <input required value={qofName} onChange={e => setQofName(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" placeholder="Full name" />
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-neutral-600">Phone Number</label>
                          <input required value={qofPhone} onChange={e => setQofPhone(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl font-mono" placeholder="01XXXXXXXXX" />
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-neutral-600">Delivery Address</label>
                          <textarea required value={qofAddress} onChange={e => setQofAddress(e.target.value)} rows={2} className="w-full px-3 py-2.5 border rounded-xl" placeholder="House, Road, Area, City..." />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-3.5 rounded-2xl bg-[#2F5233] hover:bg-[#3D6B45] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition-all"
                        >
                          <Zap className="w-4 h-4 text-[#D9A441]" />
                          {ctaText || `অর্ডার করুন ${qofQty} প্যাক — ${formatCurrency(qofPrice * qofQty)} (COD)`}
                        </button>
                      </form>
                    </div>
                  </div>
                </section>
              );
            }

            default:
              return null;
          }
        })}
    </div>
  );
};
