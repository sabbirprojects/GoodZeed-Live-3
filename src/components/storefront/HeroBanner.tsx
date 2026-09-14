import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { HeroMediaItem } from '../../types';
import { normalizeHeroMedia, parseVideoUrl, resolveSlideCtaInfo, resolveSlideSecondaryCtaInfo } from '../../utils/mediaUtils';
import {
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  Droplets,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Video as VideoIcon
} from 'lucide-react';

import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { Autoplay, EffectFade, Navigation, Pagination, A11y } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

interface SlideItem {
  id: string;
  badge: string;
  title: string;
  bengaliTitle: string;
  description: string;
  ctaText: string;
  categorySlug: string | null;
  secondaryCtaText?: string;
  secondaryView?: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  videoSource?: 'direct' | 'youtube' | 'vimeo';
  highlightChip: string;
  chipIcon: React.ElementType;
  // Enhanced per-slide fields
  rawMediaItem?: HeroMediaItem;
  overlay?: 'light' | 'medium' | 'dark';
  advancedHtml?: string;
}

const DEFAULT_HERO_SLIDES: SlideItem[] = [
  {
    id: 'slide-honey',
    badge: '100% Raw • Direct Sundarban Harvest',
    title: 'Wild Sundarban Mangrove Honey',
    bengaliTitle: 'সুন্দরবনের খাঁটি বুনো খলসী ও পদ্ম মধু',
    description: 'Collected by generational Mouals deep inside mangrove forests. Zero sugar feeding, zero heat processing, 100% lab-verified raw purity.',
    ctaText: 'Shop Raw Honey',
    categorySlug: 'pure-honey',
    secondaryCtaText: 'Read Harvest Story',
    secondaryView: 'landing',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1600&q=85',
    highlightChip: 'From ৳470 • Glass Jars',
    chipIcon: Sparkles,
    overlay: 'medium',
  },
  {
    id: 'slide-oils',
    badge: 'Wooden Ghani • Low-Temperature Press',
    title: 'Pure Cold-Pressed Mustard & Kalijira Oils',
    bengaliTitle: 'কাঠের ঘানিতে ভাঙা খাঁটি ঝাঁঝালো তেল',
    description: 'Pressed slowly below 40°C to preserve natural pungency, essential fatty acids, and active thymoquinone. Never chemical or machine heated.',
    ctaText: 'Explore Pure Oils',
    categorySlug: 'cold-pressed-oils',
    secondaryCtaText: 'Mustard 500ml & 1L',
    secondaryView: 'shop',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1600&q=85',
    highlightChip: 'First Press • 0% Adulteration',
    chipIcon: Droplets,
    overlay: 'medium',
  },
  {
    id: 'slide-chia-nuts',
    badge: 'Grade-A Superfoods • Triple Cleaned',
    title: 'Organic Chia Seeds & California Almonds',
    bengaliTitle: 'জৈব চিয়া সিড ও ক্যালিফোর্নিয়া বাদাম',
    description: 'Nutrient-dense superfoods packed with natural Omega-3, dietary fiber, and plant protein. 100% stone and dust-free optical sort.',
    ctaText: 'Shop Superfoods',
    categorySlug: 'nuts-seeds',
    secondaryCtaText: 'Explore All Staples',
    secondaryView: 'shop',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=1600&q=85',
    highlightChip: 'High Omega-3 & Energy',
    chipIcon: ShieldCheck,
    overlay: 'medium',
  },
  {
    id: 'slide-delivery-cod',
    badge: 'All 64 Districts • Cash on Delivery',
    title: 'Pure Everyday Food at Your Doorstep',
    bengaliTitle: 'সারা বাংলাদেশে বিশ্বস্ত ক্যাশ অন ডেলিভারি',
    description: 'Stock your family pantry with pure honey, ghee, and cold-pressed oils. Easy payment via Cash on Delivery, bKash, or Nagad with instant tracking.',
    ctaText: 'Browse Full Catalog',
    categorySlug: null,
    secondaryCtaText: 'Track Your Order',
    secondaryView: 'track-order',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=85',
    highlightChip: 'Fast 24-48h Delivery',
    chipIcon: Truck,
    overlay: 'medium',
  }
];

/**
 * Slide Video Player component with responsive object-cover scaling,
 * autoplay compliance (muted by default), and viewer sound/pause toggles.
 */
interface SlideVideoPlayerProps {
  url: string;
  title: string;
  isActive: boolean;
}

const SlideVideoPlayer: React.FC<SlideVideoPlayerProps> = ({ url, title, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoDetails = parseVideoUrl(url);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
      else { videoRef.current.play().catch(() => {}); setIsPlaying(true); }
    }
  };

  if (videoDetails.type === 'youtube' || videoDetails.type === 'vimeo') {
    return (
      <div className="relative w-full h-full overflow-hidden bg-black">
        <iframe
          src={videoDetails.embedUrl}
          title={title || 'Hero Banner Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] min-w-full min-h-full object-cover pointer-events-none border-0"
        />
        <div className="absolute top-3 right-3 z-30 pointer-events-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold border border-white/20 shadow-xs">
            <VideoIcon className="w-3 h-3 text-red-500" />
            {videoDetails.type === 'youtube' ? 'YouTube HD' : 'Vimeo Video'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <video ref={videoRef} src={url} autoPlay loop muted={isMuted} playsInline className="w-full h-full object-cover object-center" />
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
        <button type="button" onClick={togglePlay} className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs border border-white/20 shadow-xs transition-colors" aria-label={isPlaying ? 'Pause video' : 'Play video'}>
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
        <button type="button" onClick={toggleMute} className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs border border-white/20 shadow-xs transition-colors" aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}>
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#D9A441]" />}
        </button>
      </div>
    </div>
  );
};

export const HeroBanner: React.FC = () => {
  const {
    homepageSections,
    setCurrentView,
    setSelectedCategorySlug,
    setSelectedProductSlug,
    setSelectedLandingSlug
  } = useStore();
  const shouldReduceMotion = useReducedMotion();
  const heroSection = homepageSections.find(s => s.sectionType === 'HERO');

  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (heroSection && !heroSection.isEnabled) {
    return null;
  }

  // Check for CMS overrides or normalized media list
  const normalizedMedia = normalizeHeroMedia(heroSection);
  // Filter out draft slides
  const publishedMedia = normalizedMedia.filter(m => !m.status || m.status === 'published');
  const hasCmsMedia = publishedMedia.length > 0;
  const hasCmsCopy = !!(
    heroSection?.heroHeadline ||
    heroSection?.heading ||
    heroSection?.heroDescription ||
    heroSection?.bodyText
  );

  let slides: SlideItem[] = DEFAULT_HERO_SLIDES;

  if (hasCmsMedia) {
    // Build slides from CMS media with per-slide overrides + global fallbacks
    slides = publishedMedia.map((media, idx) => ({
      id: media.id || `cms-slide-${idx}`,
      badge: media.badge || heroSection?.badge || '100% Lab Tested Purity',
      title: media.title || heroSection?.heroHeadline || heroSection?.heading || 'GoodZeed Pure Natural Food',
      bengaliTitle: media.subtitle || heroSection?.heroBengaliTitle || 'সুন্দরবনের খাঁটি পণ্য',
      description: media.description || media.caption || heroSection?.heroDescription || heroSection?.bodyText || 'Directly sourced from Sundarban Mouals, organic seed farms, and traditional oil ghanis across Bangladesh.',
      ctaText: media.ctaText || heroSection?.heroCtaText || heroSection?.ctaLabel || 'Shop Pure Food',
      categorySlug: media.ctaCategorySlug || heroSection?.heroCtaCategorySlug || null,
      secondaryCtaText: media.secondaryCtaText || heroSection?.heroSecondaryCtaText || undefined,
      secondaryView: undefined,
      mediaType: media.type,
      mediaUrl: media.url,
      videoSource: media.videoSource,
      highlightChip: media.type === 'video' ? 'Full Video Feature' : 'First Press • 100% Pure',
      chipIcon: media.type === 'video' ? VideoIcon : Sparkles,
      rawMediaItem: media,
      overlay: media.overlay || 'medium',
      advancedHtml: media.advancedHtml,
    }));
  } else if (hasCmsCopy) {
    // If only copy was customized without media array, preserve single slide with fallback image
    slides = [
      {
        id: 'cms-hero-slide-single',
        badge: heroSection?.badge || '100% Lab Tested Purity',
        title: heroSection?.heroHeadline || heroSection?.heading || 'GoodZeed Pure Natural Food',
        bengaliTitle: heroSection?.heroBengaliTitle || 'সুন্দরবনের খাঁটি পণ্য',
        description: heroSection?.heroDescription || heroSection?.bodyText || 'Directly sourced from Sundarban Mouals, organic seed farms, and traditional oil ghanis across Bangladesh.',
        ctaText: heroSection?.heroCtaText || heroSection?.ctaLabel || 'Shop Pure Food',
        categorySlug: heroSection?.heroCtaCategorySlug || null,
        secondaryCtaText: heroSection?.heroSecondaryCtaText || undefined,
        secondaryView: undefined,
        mediaType: 'image',
        mediaUrl: heroSection?.heroImageUrl || heroSection?.mediaUrl || DEFAULT_HERO_SLIDES[0].mediaUrl,
        highlightChip: 'First Press • 100% Pure',
        chipIcon: Sparkles,
        overlay: 'medium',
      }
    ];
  }

  // Navigation handler using per-slide CTA info
  const navigateCta = (info: ReturnType<typeof resolveSlideCtaInfo>, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (info.externalUrl) {
      if (info.openInNewTab) window.open(info.externalUrl, '_blank', 'noopener,noreferrer');
      else window.location.href = info.externalUrl;
      return;
    }
    if (info.view === 'category') {
      setSelectedCategorySlug(info.categorySlug);
      setCurrentView('category');
    } else if (info.view === 'product') {
      setSelectedProductSlug?.(info.productSlug);
      setCurrentView('product');
    } else if (info.view === 'landing') {
      setSelectedLandingSlug?.(info.landingSlug);
      setCurrentView('landing');
    } else if (info.view === 'track-order') {
      setCurrentView('track-order');
    } else {
      setSelectedCategorySlug(null);
      setCurrentView('shop');
    }
  };

  // Legacy navigation for default slides (no rawMediaItem)
  const handleLegacyPrimaryClick = (slide: SlideItem) => {
    if (slide.categorySlug) {
      setSelectedCategorySlug(slide.categorySlug);
      setCurrentView('category');
    } else {
      setSelectedCategorySlug(null);
      setCurrentView('shop');
    }
  };

  const handleLegacySecondaryClick = (slide: SlideItem) => {
    if (slide.secondaryView) setCurrentView(slide.secondaryView);
    else setCurrentView('shop');
  };

  const currentSlide = slides[activeIndex % slides.length] || slides[0];
  const ChipIcon = currentSlide.chipIcon;

  // Overlay gradient based on per-slide setting
  const overlayIntensity = currentSlide.overlay || 'medium';
  const overlayGradientH = overlayIntensity === 'light'
    ? 'from-black/55 via-black/30 to-transparent'
    : overlayIntensity === 'dark'
    ? 'from-black/95 via-black/85 to-black/55'
    : 'from-black/90 via-black/65 to-black/25';
  const overlayGradientV = overlayIntensity === 'dark' ? 'from-black/90 via-black/40 to-transparent' : 'from-black/85 via-black/20 to-transparent';

  // Text colors for light overlay auto-contrast
  const isLightOverlay = overlayIntensity === 'light';
  const titleColor = isLightOverlay ? 'text-neutral-900' : 'text-[#FAF7F2]';
  const descColor = isLightOverlay ? 'text-neutral-700' : 'text-neutral-200/90';
  const secBtnCls = isLightOverlay
    ? 'bg-neutral-900/10 hover:bg-neutral-900/20 text-neutral-900 border-neutral-900/30'
    : 'bg-white/15 hover:bg-white/25 text-white border-white/30';

  return (
    <motion.section
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 pt-0 sm:pt-5 pb-0 sm:pb-2"
    >
      {/* Compact Carousel Container */}
      <div
        id="hero-banner-carousel"
        className="relative w-full h-[400px] sm:h-[350px] md:h-[380px] lg:h-[400px] max-h-[410px] rounded-none sm:rounded-3xl overflow-hidden shadow-lg border-y border-[#2F5233]/15 sm:border border-[#2F5233]/15 bg-neutral-900 select-none group"
      >
        {/* Swiper Slider */}
        <Swiper
          modules={[Autoplay, EffectFade, Navigation, Pagination, A11y]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={700}
          loop={slides.length > 1}
          autoplay={
            slides.length > 1
              ? { delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true }
              : false
          }
          onSwiper={setSwiperInstance}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          className="w-full h-full"
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={slide.id} className="relative w-full h-full overflow-hidden">
              {/* Media Background */}
              {slide.mediaType === 'video' ? (
                <SlideVideoPlayer url={slide.mediaUrl} title={slide.title} isActive={idx === activeIndex} />
              ) : (
                <img
                  src={slide.mediaUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-1000"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_HERO_SLIDES[0].mediaUrl; }}
                />
              )}

              {/* Overlay Gradients (intensity driven by slide setting) */}
              {/* Desktop: horizontal gradient (unchanged) */}
              <div className={`absolute inset-0 bg-gradient-to-r ${overlayGradientH} sm:to-transparent pointer-events-none transition-all duration-700 hidden sm:block`} />
              {/* Mobile: light, bottom-anchored gradient only — media stays bright, no full-image darkening */}
              <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none sm:hidden" />
              <div className={`absolute inset-0 bg-gradient-to-t ${overlayGradientV} pointer-events-none hidden sm:block`} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Entire banner clickable area — triggers primary CTA */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={() => {
            if (currentSlide.rawMediaItem) {
              navigateCta(resolveSlideCtaInfo(currentSlide.rawMediaItem, heroSection));
            } else {
              handleLegacyPrimaryClick(currentSlide);
            }
          }}
          aria-label={`Go to: ${currentSlide.ctaText}`}
          role="link"
        />

        {/* Foreground Content Card (pointer-events disabled on wrapper, re-enabled on buttons) */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 md:p-10 text-white pointer-events-none">
          {/* Top Bar: Badge & Chip */}
          {/* Mobile: badge row hidden here and re-rendered bottom-left inside content block (only badge + title show on mobile) */}
          <div className="hidden sm:flex items-center justify-between gap-3 pointer-events-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`badge-${currentSlide.id}`}
                initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2F5233]/85 text-[#FAF7F2] text-[11px] sm:text-xs font-bold tracking-wide backdrop-blur-xs border border-white/15 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>{currentSlide.badge}</span>
              </motion.div>
            </AnimatePresence>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 text-[#D9A441] text-xs font-bold backdrop-blur-xs border border-[#D9A441]/30">
              <ChipIcon className="w-3.5 h-3.5" />
              <span>{currentSlide.highlightChip}</span>
            </div>
          </div>

          {/* Mobile-only bottom-left block: badge + 2-line title + 1-line description + primary CTA (~40% of hero height) */}
          {/* pointer-events-none inherited: taps outside the button pass through to the banner click layer */}
          <div className="sm:hidden max-w-[85%] min-w-0 space-y-1.5 mt-auto mb-12">
            <motion.div
              key={`m-badge-${currentSlide.id}`}
              initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2F5233]/85 text-[#FAF7F2] text-[11px] font-bold tracking-wide backdrop-blur-xs border border-white/15 shadow-xs [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]"
            >
              <Sparkles className="w-3 h-3 shrink-0 text-[#D9A441]" />
              <span className="truncate">{currentSlide.badge}</span>
            </motion.div>
            <h1 className={`font-serif-brand text-2xl font-extrabold leading-tight tracking-tight min-w-0 line-clamp-2 text-[#FAF7F2] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]`}>
              {currentSlide.title}
            </h1>
            {currentSlide.description && (
              <p className="text-xs text-neutral-100/90 leading-snug line-clamp-1 [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]">
                {currentSlide.description}
              </p>
            )}
            {/* Primary CTA only — secondary stays desktop-only */}
            <motion.button
              id="hero-carousel-mobile-primary-cta"
              onClick={(e) => {
                e.stopPropagation();
                if (currentSlide.rawMediaItem) {
                  navigateCta(resolveSlideCtaInfo(currentSlide.rawMediaItem, heroSection), e);
                } else {
                  handleLegacyPrimaryClick(currentSlide);
                }
              }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              className="pointer-events-auto px-4 py-2 rounded-xl bg-[#D9A441] hover:bg-[#e2b04f] text-[#2A2A28] font-bold text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-colors"
            >
              <span>{currentSlide.ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Middle: Content */}
          <div className="max-w-2xl space-y-1.5 sm:space-y-2.5 my-auto pointer-events-auto max-sm:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="space-y-1.5 sm:space-y-2.5"
              >
                {/* Advanced HTML mode */}
                {currentSlide.advancedHtml ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: currentSlide.advancedHtml }}
                    className="hero-advanced-html max-sm:hidden"
                  />
                ) : (
                  <>
                    {/* Mobile: no subtitle/description/CTAs — banner-level click handles the CTA */}
                    <span className={`text-xs sm:text-sm font-bold text-[#D9A441] block tracking-wide max-sm:hidden`}>
                      {currentSlide.bengaliTitle}
                    </span>

                    <h1 className={`font-serif-brand text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight drop-shadow-sm line-clamp-2 ${titleColor}`}>
                      {currentSlide.title}
                    </h1>

                    <p className={`text-xs sm:text-sm line-clamp-2 leading-relaxed max-w-xl font-normal max-sm:hidden ${descColor}`}>
                      {currentSlide.description}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-3 max-sm:hidden">
                      {/* Primary CTA */}
                      <motion.button
                        id="hero-carousel-primary-cta"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentSlide.rawMediaItem) {
                            navigateCta(resolveSlideCtaInfo(currentSlide.rawMediaItem, heroSection), e);
                          } else {
                            e.stopPropagation();
                            handleLegacyPrimaryClick(currentSlide);
                          }
                        }}
                        whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                        className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-[#D9A441] hover:bg-[#e2b04f] text-[#2A2A28] font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-colors"
                      >
                        <span>{currentSlide.ctaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>

                      {/* Secondary CTA */}
                      {currentSlide.secondaryCtaText && (
                        <motion.button
                          id="hero-carousel-secondary-cta"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentSlide.rawMediaItem && currentSlide.rawMediaItem.secondaryCtaLinkType) {
                              navigateCta(resolveSlideSecondaryCtaInfo(currentSlide.rawMediaItem), e);
                            } else {
                              handleLegacySecondaryClick(currentSlide);
                            }
                          }}
                          whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                          className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border font-semibold text-xs sm:text-sm backdrop-blur-xs transition-colors ${secBtnCls}`}
                        >
                          {currentSlide.secondaryCtaText}
                        </motion.button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Bar: Indicators */}
          <div className="flex items-center justify-between pt-2 pointer-events-auto max-sm:justify-end">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {slides.length > 1 &&
                slides.map((_, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => swiperInstance?.slideToLoop(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    animate={{ width: idx === activeIndex ? 28 : 8, opacity: idx === activeIndex ? 1 : 0.6 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`h-2 rounded-full ${idx === activeIndex ? 'bg-[#D9A441]' : 'bg-white/40 hover:bg-white/70'}`}
                  />
                ))}
            </div>

            {slides.length > 1 && (
              <div className="text-[11px] font-mono font-bold text-white/75 bg-black/40 px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                0{activeIndex + 1} / 0{slides.length}
              </div>
            )}
          </div>
        </div>

        {/* Carousel Arrow Controls */}
        {slides.length > 1 && (
          <>
            <button
              id="hero-carousel-prev-btn"
              onClick={(e) => { e.stopPropagation(); swiperInstance?.slidePrev(); }}
              aria-label="Previous slide"
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/85 hover:bg-white text-[#2F5233] shadow-md flex items-center justify-center transition-all opacity-75 sm:opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              id="hero-carousel-next-btn"
              onClick={(e) => { e.stopPropagation(); swiperInstance?.slideNext(); }}
              aria-label="Next slide"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/85 hover:bg-white text-[#2F5233] shadow-md flex items-center justify-center transition-all opacity-75 sm:opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}
      </div>
    </motion.section>
  );
};
