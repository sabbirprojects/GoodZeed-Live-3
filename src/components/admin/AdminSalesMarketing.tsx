import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { LandingPage, LandingPageBlock, LandingPageBlockType, HeroMediaItem } from '../../types';
import { MediaUploadInput } from './MediaUploadInput';
import { HeroMediaManager } from './HeroMediaManager';
import { normalizeHeroMedia, parseVideoUrl } from '../../utils/mediaUtils';
import {
  Megaphone,
  Image as ImageIcon,
  Plus,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Sparkles,
  Save,
  Clock,
  Code2,
  X,
  CheckCircle2,
  ListChecks,
  HelpCircle,
  Globe,
  BarChart2,
  Facebook,
  Layout,
  Star,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Play,
  Video,
  ChevronDown,
  ChevronUp,
  Settings2
} from 'lucide-react';

interface AdminSalesMarketingProps {
  defaultTab?: 'hero' | 'campaigns';
}

const BLOCK_TYPE_OPTIONS: { type: LandingPageBlockType; label: string; icon: React.ElementType; desc: string }[] = [
  { type: 'HERO',             label: 'Hero Banner',        icon: ImageIcon,    desc: 'Full-width header with image, headline, CTA button' },
  { type: 'BENEFITS',         label: 'Benefits Grid',      icon: ListChecks,   desc: 'Feature/benefit cards with icons and descriptions' },
  { type: 'TESTIMONIALS',     label: 'Testimonials',       icon: Star,         desc: 'Customer review cards with names and ratings' },
  { type: 'PURCHASE_SECTION', label: 'Quick Buy Section',  icon: ShoppingBag,  desc: 'Embedded product selector + buy now button' },
  { type: 'FAQ',              label: 'FAQ Accordion',      icon: HelpCircle,   desc: 'Collapsible Q&A section for common questions' },
  { type: 'COUNTDOWN_TIMER',  label: 'Countdown Timer',    icon: Clock,        desc: 'Urgency countdown to a deadline date/time' },
  { type: 'QUICK_ORDER_FORM', label: 'Quick Order Form',   icon: ShoppingBag,  desc: 'Standalone COD order form without cart' },
  { type: 'CUSTOM_HTML',      label: 'Custom HTML Block',  icon: Code2,        desc: 'Raw HTML with auto-sanitization for full flexibility' },
];

function defaultContent(type: LandingPageBlockType): Record<string, any> {
  switch (type) {
    case 'HERO':             return { badge: '', heading: '', subheading: '', ctaText: 'Order Now', imageUrl: '' };
    case 'BENEFITS':         return { heading: 'Why Choose Us', items: [{ title: 'Benefit 1', desc: 'Description' }] };
    case 'TESTIMONIALS':     return { heading: 'What Customers Say', items: [{ name: 'Happy Customer', rating: 5, text: 'Great product!', location: 'Dhaka' }] };
    case 'PURCHASE_SECTION': return { productId: '', heading: 'Order Your Pack', subheading: 'No account needed. Cash on Delivery.' };
    case 'FAQ':              return { heading: 'Frequently Asked Questions', faqs: [{ q: 'Is delivery available?', a: 'Yes, nationwide.' }] };
    case 'COUNTDOWN_TIMER':  return { heading: 'Limited Time Offer Ends In:', endsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), subtext: 'Order before the timer runs out' };
    case 'QUICK_ORDER_FORM': return { heading: 'Order Directly', productId: '', ctaText: 'Place Order (Cash on Delivery)' };
    case 'CUSTOM_HTML':      return { rawHtml: '<div class="custom-block"><h3>Custom Content</h3><p>Write your HTML here.</p></div>' };
    default:                 return {};
  }
}

// ── Block Editor ────────────────────────────────────────────────────────────
interface BlockEditorProps {
  block: LandingPageBlock;
  onChange: (updated: LandingPageBlock) => void;
  products: { id: string; name: string }[];
}

const BlockEditor: React.FC<BlockEditorProps> = ({ block, onChange, products }) => {
  const c = block.content;
  const set = (patch: Record<string, any>) => onChange({ ...block, content: { ...c, ...patch } });
  const inputCls = "w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5233]";
  const labelCls = "block font-bold mb-1 text-neutral-600 text-xs";

  switch (block.blockType) {
    case 'HERO':
      return (
        <div className="space-y-3 text-xs">
          <div><label className={labelCls}>Badge</label><input className={inputCls} value={c.badge || ''} onChange={e => set({ badge: e.target.value })} placeholder="Limited Harvest 2026" /></div>
          <div><label className={labelCls}>Headline</label><input className={inputCls} value={c.heading || ''} onChange={e => set({ heading: e.target.value })} placeholder="Main hero headline" /></div>
          <div><label className={labelCls}>Sub-headline</label><textarea className={inputCls} rows={2} value={c.subheading || ''} onChange={e => set({ subheading: e.target.value })} placeholder="Supporting text..." /></div>
          <div><label className={labelCls}>CTA Button Text</label><input className={inputCls} value={c.ctaText || ''} onChange={e => set({ ctaText: e.target.value })} placeholder="Order Now" /></div>
          <MediaUploadInput label="Hero Image URL" value={c.imageUrl || ''} onChange={url => set({ imageUrl: url })} />
        </div>
      );

    case 'BENEFITS': {
      const items: { title: string; desc: string }[] = c.items || [];
      return (
        <div className="space-y-3 text-xs">
          <div><label className={labelCls}>Section Heading</label><input className={inputCls} value={c.heading || ''} onChange={e => set({ heading: e.target.value })} /></div>
          {items.map((item, idx) => (
            <div key={idx} className="p-3 bg-neutral-50 rounded-xl space-y-2 border">
              <input className={inputCls} value={item.title} onChange={e => { const n = [...items]; n[idx] = { ...n[idx], title: e.target.value }; set({ items: n }); }} placeholder="Benefit title" />
              <input className={inputCls} value={item.desc} onChange={e => { const n = [...items]; n[idx] = { ...n[idx], desc: e.target.value }; set({ items: n }); }} placeholder="Benefit description" />
              <button onClick={() => set({ items: items.filter((_: any, i: number) => i !== idx) })} className="text-red-500 text-[11px] hover:underline">Remove</button>
            </div>
          ))}
          <button onClick={() => set({ items: [...items, { title: 'New Benefit', desc: '' }] })} className="text-xs text-[#2F5233] font-bold hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Benefit
          </button>
        </div>
      );
    }

    case 'TESTIMONIALS': {
      const items: { name: string; rating: number; text: string; location: string }[] = c.items || [];
      return (
        <div className="space-y-3 text-xs">
          <div><label className={labelCls}>Section Heading</label><input className={inputCls} value={c.heading || ''} onChange={e => set({ heading: e.target.value })} /></div>
          {items.map((item, idx) => (
            <div key={idx} className="p-3 bg-neutral-50 rounded-xl space-y-2 border">
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} value={item.name} onChange={e => { const n = [...items]; n[idx] = { ...n[idx], name: e.target.value }; set({ items: n }); }} placeholder="Reviewer Name" />
                <input className={inputCls} value={item.location} onChange={e => { const n = [...items]; n[idx] = { ...n[idx], location: e.target.value }; set({ items: n }); }} placeholder="Location (e.g. Dhaka)" />
              </div>
              <div className="flex items-center gap-2">
                <span className={labelCls + " mb-0"}>Rating:</span>
                {[1, 2, 3, 4, 5].map(r => (
                  <button key={r} onClick={() => { const n = [...items]; n[idx] = { ...n[idx], rating: r }; set({ items: n }); }}
                    className={`text-lg ${item.rating >= r ? 'text-[#D9A441]' : 'text-neutral-300'}`}>★</button>
                ))}
              </div>
              <textarea className={inputCls} rows={2} value={item.text} onChange={e => { const n = [...items]; n[idx] = { ...n[idx], text: e.target.value }; set({ items: n }); }} placeholder="Review text..." />
              <button onClick={() => set({ items: items.filter((_: any, i: number) => i !== idx) })} className="text-red-500 text-[11px] hover:underline">Remove</button>
            </div>
          ))}
          <button onClick={() => set({ items: [...items, { name: 'Happy Customer', rating: 5, text: 'Great product!', location: 'Dhaka' }] })} className="text-xs text-[#2F5233] font-bold hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Testimonial
          </button>
        </div>
      );
    }

    case 'PURCHASE_SECTION':
      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className={labelCls}>Product</label>
            <select className={inputCls} value={c.productId || ''} onChange={e => set({ productId: e.target.value })}>
              <option value="">— Select a product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Section Heading</label><input className={inputCls} value={c.heading || ''} onChange={e => set({ heading: e.target.value })} /></div>
          <div><label className={labelCls}>Sub-heading</label><input className={inputCls} value={c.subheading || ''} onChange={e => set({ subheading: e.target.value })} /></div>
        </div>
      );

    case 'FAQ': {
      const faqs: { q: string; a: string }[] = c.faqs || [];
      return (
        <div className="space-y-3 text-xs">
          <div><label className={labelCls}>Section Heading</label><input className={inputCls} value={c.heading || ''} onChange={e => set({ heading: e.target.value })} /></div>
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-3 bg-neutral-50 rounded-xl space-y-2 border">
              <input className={inputCls} value={faq.q} onChange={e => { const n = [...faqs]; n[idx] = { ...n[idx], q: e.target.value }; set({ faqs: n }); }} placeholder="Question" />
              <textarea className={inputCls} rows={2} value={faq.a} onChange={e => { const n = [...faqs]; n[idx] = { ...n[idx], a: e.target.value }; set({ faqs: n }); }} placeholder="Answer" />
              <button onClick={() => set({ faqs: faqs.filter((_: any, i: number) => i !== idx) })} className="text-red-500 text-[11px] hover:underline">Remove</button>
            </div>
          ))}
          <button onClick={() => set({ faqs: [...faqs, { q: 'New question?', a: 'Answer here.' }] })} className="text-xs text-[#2F5233] font-bold hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add FAQ
          </button>
        </div>
      );
    }

    case 'COUNTDOWN_TIMER':
      return (
        <div className="space-y-3 text-xs">
          <div><label className={labelCls}>Countdown Heading</label><input className={inputCls} value={c.heading || ''} onChange={e => set({ heading: e.target.value })} placeholder="Limited Time Offer Ends In:" /></div>
          <div>
            <label className={labelCls}>Countdown End Date & Time</label>
            <input type="datetime-local" className={inputCls + " font-mono"} value={c.endsAt ? c.endsAt.slice(0, 16) : ''} onChange={e => set({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
          </div>
          <div><label className={labelCls}>Sub-text (shown below timer)</label><input className={inputCls} value={c.subtext || ''} onChange={e => set({ subtext: e.target.value })} placeholder="Order before the timer runs out" /></div>
        </div>
      );

    case 'QUICK_ORDER_FORM':
      return (
        <div className="space-y-3 text-xs">
          <div><label className={labelCls}>Form Heading</label><input className={inputCls} value={c.heading || ''} onChange={e => set({ heading: e.target.value })} placeholder="Order Directly — No Account Needed" /></div>
          <div>
            <label className={labelCls}>Product</label>
            <select className={inputCls} value={c.productId || ''} onChange={e => set({ productId: e.target.value })}>
              <option value="">— Select a product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>CTA Button Text</label><input className={inputCls} value={c.ctaText || ''} onChange={e => set({ ctaText: e.target.value })} placeholder="Place Order (Cash on Delivery)" /></div>
        </div>
      );

    case 'CUSTOM_HTML':
      return (
        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
            <Code2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p>HTML is auto-sanitized before rendering. Scripts, iframes, and event handlers are stripped.</p>
          </div>
          <div>
            <label className={labelCls}>Raw HTML</label>
            <textarea
              className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono bg-neutral-950 text-green-400 focus:outline-none focus:ring-2 focus:ring-[#2F5233]"
              rows={12}
              value={c.rawHtml || ''}
              onChange={e => set({ rawHtml: e.target.value })}
              placeholder="<div>Your custom HTML...</div>"
              spellCheck={false}
            />
          </div>
        </div>
      );

    default:
      return <div className="text-xs text-neutral-400">No editor for block type: {block.blockType}</div>;
  }
};

// ── Hero Banner CMS Tab ────────────────────────────────────────────────────
const HeroBannerTab: React.FC = () => {
  const { homepageSections, updateHomepageSection, showToast, products, categories, landingPages } = useStore();
  const heroSection = homepageSections.find(s => s.sectionType === 'HERO');

  const [mediaList, setMediaList] = useState<HeroMediaItem[]>(() => normalizeHeroMedia(heroSection));
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [globalDefaultsOpen, setGlobalDefaultsOpen] = useState(false);

  const [form, setForm] = useState({
    heroHeadline: heroSection?.heroHeadline || heroSection?.heading || '',
    heroBengaliTitle: heroSection?.heroBengaliTitle || '',
    heroDescription: heroSection?.heroDescription || heroSection?.bodyText || '',
    heroCtaText: heroSection?.heroCtaText || heroSection?.ctaLabel || '',
    heroCtaCategorySlug: heroSection?.heroCtaCategorySlug || '',
    heroSecondaryCtaText: heroSection?.heroSecondaryCtaText || '',
    heroImageUrl: heroSection?.heroImageUrl || heroSection?.mediaUrl || '',
    heroVideoUrl: heroSection?.heroVideoUrl || '',
    badge: heroSection?.badge || '',
    isEnabled: heroSection?.isEnabled ?? true,
  });
  const [saved, setSaved] = useState(false);

  // Sync state if heroSection changes in store
  useEffect(() => {
    if (heroSection) {
      setMediaList(normalizeHeroMedia(heroSection));
    }
  }, [heroSection?.id]);

  const handleMediaChange = (newList: HeroMediaItem[]) => {
    setMediaList(newList);
    if (activePreviewIdx >= newList.length) {
      setActivePreviewIdx(Math.max(0, newList.length - 1));
    }
    const cover = newList.find(m => m.type === 'image') || newList[0];
    const vid = newList.find(m => m.type === 'video');
    setForm(prev => ({
      ...prev,
      heroImageUrl: cover?.url || prev.heroImageUrl,
      heroVideoUrl: vid?.url || prev.heroVideoUrl
    }));
  };

  const handleSave = () => {
    if (!heroSection) return;
    const cover = mediaList.find(m => m.type === 'image') || mediaList[0];
    const vid = mediaList.find(m => m.type === 'video');

    updateHomepageSection(heroSection.id, {
      ...form,
      heroMedia: mediaList,
      heroImageUrl: cover?.url || form.heroImageUrl,
      mediaUrl: cover?.url || form.heroImageUrl,
      heroVideoUrl: vid?.url || form.heroVideoUrl
    });
    setSaved(true);
    showToast('Hero Banner CMS & Media Carousel settings saved', 'success');
    setTimeout(() => setSaved(false), 2500);
  };

  if (!heroSection) return (
    <div className="text-center py-12 text-neutral-400 text-sm">Hero section not found in homepage configuration.</div>
  );

  const inputCls = "w-full px-3 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5233]";
  const labelCls = "block font-bold mb-1 text-neutral-700 text-xs";

  const currentPreviewItem = mediaList[activePreviewIdx];
  const defaultFallbackImage = 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1600&q=85';

  // Per-slide content with fallback to global form values
  const previewBadge    = currentPreviewItem?.badge        || form.badge        || '100% Raw • Direct Sundarban Harvest';
  const previewBengali  = currentPreviewItem?.subtitle     || form.heroBengaliTitle || 'সুন্দরবনের খাঁটি বুনো খলসী ও পদ্ম মধু';
  const previewHeadline = currentPreviewItem?.title        || form.heroHeadline || 'Wild Sundarban Mangrove Honey';
  const previewDesc     = currentPreviewItem?.description  || form.heroDescription || 'Directly sourced from Sundarban Mouals, organic seed farms, and traditional oil ghanis across Bangladesh.';
  const previewCta      = currentPreviewItem?.ctaText      || form.heroCtaText  || 'Shop Raw Honey';
  const previewSecCta   = currentPreviewItem?.secondaryCtaText || form.heroSecondaryCtaText;

  const isVideo = currentPreviewItem?.type === 'video';
  const videoDetails = isVideo ? parseVideoUrl(currentPreviewItem.url) : null;

  // Overlay gradient classes based on per-slide setting
  const overlayVal = currentPreviewItem?.overlay || 'medium';
  const overlayFrom = overlayVal === 'light' ? 'from-black/50 via-black/30 to-transparent' : overlayVal === 'dark' ? 'from-black/95 via-black/80 to-black/50' : 'from-black/85 via-black/60 to-black/20';
  const textColor = overlayVal === 'light' ? 'text-neutral-900' : 'text-white';

  // Props for HeroMediaManager
  const productOptions = products.map(p => ({ id: p.id, name: p.name, slug: p.slug }));
  const categoryOptions = categories.map(c => ({ id: c.id, name: c.name, slug: c.slug }));
  const landingOptions = landingPages.map(lp => ({ id: lp.id, title: lp.title, slug: lp.slug }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex gap-3">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
        <div>
          <strong>Hero Banner Multi-Media Carousel CMS:</strong> Each slide now has its own badge, title, subtitle, description, CTA links, overlay, and draft/live status. Global defaults below apply to slides without per-slide overrides.
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#2F5233]">
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-[#D9A441]" />
            Live Storefront Hero Preview {mediaList.length > 1 && `(Slide ${activePreviewIdx + 1} of ${mediaList.length})`}
          </span>
          <div className="flex items-center gap-2">
            {currentPreviewItem?.status === 'draft' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-600 font-bold">Draft Slide</span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${form.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {form.isEnabled ? 'Active on Storefront' : 'Disabled / Hidden'}
            </span>
          </div>
        </div>

        <div className="relative w-full h-[240px] sm:h-[280px] rounded-2xl overflow-hidden shadow-lg border border-[#2F5233]/20 bg-neutral-900 select-none group">
          {/* Media Player / Background */}
          {isVideo && videoDetails ? (
            videoDetails.type === 'youtube' || videoDetails.type === 'vimeo' ? (
              <iframe
                src={videoDetails.embedUrl}
                title="Hero Video Preview"
                className="w-full h-full object-cover pointer-events-none border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              <video
                src={currentPreviewItem.url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover object-center"
              />
            )
          ) : (
            <img
              src={currentPreviewItem?.url || form.heroImageUrl || defaultFallbackImage}
              alt="Hero Banner Preview"
              className="w-full h-full object-cover object-center"
              onError={(e) => { (e.target as HTMLImageElement).src = defaultFallbackImage; }}
            />
          )}

          {/* Overlay (respects per-slide intensity) */}
          <div className={`absolute inset-0 bg-gradient-to-r ${overlayFrom} pointer-events-none`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* Advanced HTML preview indicator */}
          {currentPreviewItem?.advancedHtml && (
            <div className="absolute top-2 right-2 z-20 px-2 py-0.5 bg-neutral-900/80 text-green-400 text-[9px] font-mono font-bold rounded backdrop-blur-xs">
              &lt;HTML mode&gt;
            </div>
          )}

          {/* Foreground Text & CTA */}
          <div className={`absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 ${textColor} pointer-events-none`}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2F5233]/90 text-[#FAF7F2] text-[10px] font-bold border border-white/15">
                <Sparkles className="w-3 h-3 text-[#D9A441]" /> {previewBadge}
              </span>
              {isVideo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600/90 text-white text-[10px] font-bold backdrop-blur-xs">
                  <Video className="w-3 h-3" />
                  {videoDetails?.type === 'youtube' ? 'YouTube Video' : videoDetails?.type === 'vimeo' ? 'Vimeo Video' : 'MP4 Video'}
                </span>
              )}
            </div>

            <div className="max-w-xl space-y-1 my-auto">
              {previewBengali && <span className="text-[11px] font-bold text-[#D9A441] block">{previewBengali}</span>}
              <h2 className={`font-serif-brand text-lg sm:text-2xl font-extrabold leading-tight drop-shadow-xs line-clamp-2 ${textColor}`}>{previewHeadline}</h2>
              <p className={`text-xs line-clamp-2 leading-relaxed font-normal ${overlayVal === 'light' ? 'text-neutral-800' : 'text-neutral-200/90'}`}>{previewDesc}</p>
              <div className="pt-2 flex items-center gap-2">
                <span className="px-4 py-1.5 rounded-xl bg-[#D9A441] text-[#2A2A28] font-bold text-xs shadow-xs">{previewCta}</span>
                {previewSecCta && (
                  <span className={`px-3 py-1.5 rounded-xl font-semibold text-xs border ${overlayVal === 'light' ? 'bg-neutral-900/10 text-neutral-900 border-neutral-900/30' : 'bg-white/15 text-white border-white/30'}`}>
                    {previewSecCta}
                  </span>
                )}
              </div>
            </div>

            {/* Slide switch indicator dots */}
            {mediaList.length > 1 && (
              <div className="flex items-center justify-between pt-2 pointer-events-auto">
                <div className="flex items-center gap-1.5">
                  {mediaList.map((_, idx) => (
                    <button key={idx} type="button" onClick={() => setActivePreviewIdx(idx)}
                      className={`h-1.5 rounded-full transition-all ${idx === activePreviewIdx ? 'w-5 bg-[#D9A441]' : 'w-2 bg-white/40 hover:bg-white/70'}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-white/75 bg-black/50 px-2 py-0.5 rounded">
                  0{activePreviewIdx + 1} / 0{mediaList.length}
                </span>
              </div>
            )}
          </div>

          {/* Slide Arrow Navigation on Live Preview */}
          {mediaList.length > 1 && (
            <>
              <button type="button" onClick={() => setActivePreviewIdx(prev => (prev - 1 + mediaList.length) % mediaList.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setActivePreviewIdx(prev => (prev + 1) % mediaList.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-serif-brand font-bold text-base text-[#2F5233]">Hero Banner Settings</h3>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-neutral-700">
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={e => setForm({ ...form, isEnabled: e.target.checked })}
              className="rounded text-[#2F5233] focus:ring-[#2F5233]"
            />
            Show Hero Banner on Storefront
          </label>
        </div>

        {/* Global Defaults — collapsible */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setGlobalDefaultsOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-neutral-700">
              <Settings2 className="w-3.5 h-3.5 text-[#2F5233]" />
              Global Defaults
              <span className="text-neutral-400 font-normal">— fallback copy for slides without per-slide overrides</span>
            </span>
            {globalDefaultsOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
          </button>

          {globalDefaultsOpen && (
            <div className="px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-neutral-200">
              <div>
                <label className={labelCls}>Badge / Subtitle Tag</label>
                <input type="text" className={inputCls} value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="e.g. 100% Raw • Direct Harvest" />
              </div>
              <div>
                <label className={labelCls}>Bengali Subtitle</label>
                <input type="text" className={inputCls} value={form.heroBengaliTitle} onChange={e => setForm({ ...form, heroBengaliTitle: e.target.value })} placeholder="সুন্দরবনের খাঁটি বুনো মধু..." />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Headline (Main Title)</label>
                <input type="text" className={inputCls} value={form.heroHeadline} onChange={e => setForm({ ...form, heroHeadline: e.target.value })} placeholder="e.g. Wild Sundarban Mangrove Honey" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description / Body Text</label>
                <textarea rows={3} className={inputCls} value={form.heroDescription} onChange={e => setForm({ ...form, heroDescription: e.target.value })} placeholder="Short description shown under the headline..." />
              </div>
              <div>
                <label className={labelCls}>Primary CTA Button Text</label>
                <input type="text" className={inputCls} value={form.heroCtaText} onChange={e => setForm({ ...form, heroCtaText: e.target.value })} placeholder="e.g. Shop Raw Honey" />
              </div>
              <div>
                <label className={labelCls}>Primary CTA Category Slug</label>
                <input type="text" className={inputCls + " font-mono"} value={form.heroCtaCategorySlug} onChange={e => setForm({ ...form, heroCtaCategorySlug: e.target.value })} placeholder="e.g. pure-honey (blank = all products)" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Secondary CTA Text</label>
                <input type="text" className={inputCls} value={form.heroSecondaryCtaText} onChange={e => setForm({ ...form, heroSecondaryCtaText: e.target.value })} placeholder="e.g. Read Harvest Story" />
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Multi-Media Manager */}
        <div className="pt-2 border-t border-neutral-100">
          <label className="block font-bold mb-3 text-neutral-800 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D9A441]" />
            <span>Hero Banner Media Carousel (Multiple Images & Video)</span>
          </label>

          <HeroMediaManager
            mediaList={mediaList}
            onChange={handleMediaChange}
            products={productOptions}
            categories={categoryOptions}
            landingPages={landingOptions}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          {saved && <span className="text-xs text-[#2F5233] font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</span>}
          <button onClick={handleSave} className="px-5 py-2.5 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors">
            <Save className="w-3.5 h-3.5" /> Save Hero Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Campaign Pages Tab ─────────────────────────────────────────────────────
const CampaignPagesTab: React.FC = () => {
  const navigate = useNavigate();
  const {
    landingPages, products,
    addLandingPage, updateLandingPage,
    togglePublishLandingPage, deleteLandingPage,
    addLandingPageBlock, updateLandingPageBlock, deleteLandingPageBlock,
    setCurrentView, setSelectedLandingSlug, showToast
  } = useStore();

  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [editingBlock, setEditingBlock] = useState<LandingPageBlock | null>(null);
  const [addingBlockType, setAddingBlockType] = useState<LandingPageBlockType | null>(null);
  const [activeSection, setActiveSection] = useState<'meta' | 'seo' | 'tracking' | 'blocks'>('meta');

  useEffect(() => {
    if (!selectedPage) return;
    const fresh = landingPages.find(p => p.id === selectedPage.id);
    if (fresh) setSelectedPage(fresh);
  }, [landingPages]);

  const handleCreateNew = () => {
    const ts = Date.now();
    addLandingPage({ slug: `campaign-${ts.toString().slice(-5)}`, title: 'New Campaign Page', seoTitle: 'Campaign | GoodZeed', seoDescription: '', isPublished: false, isNoIndex: false, blocks: [] });
  };

  const handlePreview = (slug: string) => {
    setSelectedLandingSlug(slug);
    setCurrentView('landing');
    navigate('/');
  };

  const handleSavePageMeta = () => {
    if (!selectedPage) return;
    updateLandingPage(selectedPage.id, {
      title: selectedPage.title,
      slug: selectedPage.slug,
      seoTitle: selectedPage.seoTitle,
      seoDescription: selectedPage.seoDescription,
      socialShareImage: selectedPage.socialShareImage,
      facebookPixelId: selectedPage.facebookPixelId,
      googleAnalyticsId: selectedPage.googleAnalyticsId,
      countdownEndsAt: selectedPage.countdownEndsAt,
      isNoIndex: selectedPage.isNoIndex,
    });
    showToast('Campaign page settings saved', 'success');
  };

  const handleSaveBlock = () => {
    if (!editingBlock || !selectedPage) return;
    updateLandingPageBlock(selectedPage.id, editingBlock.id, { content: editingBlock.content });
    setEditingBlock(null);
  };

  const handleAddBlock = () => {
    if (!addingBlockType || !selectedPage) return;
    addLandingPageBlock(selectedPage.id, { blockType: addingBlockType, sortOrder: selectedPage.blocks.length + 1, content: defaultContent(addingBlockType) });
    setAddingBlockType(null);
  };

  const productOptions = products.map(p => ({ id: p.id, name: p.name }));

  const inputCls = "w-full px-3 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5233]";
  const labelCls = "block font-bold mb-1 text-neutral-600 text-xs";

  if (selectedPage) {
    const freshPage = landingPages.find(p => p.id === selectedPage.id) || selectedPage;
    const sections = [
      { key: 'meta',     label: 'Page Info',     icon: Layout },
      { key: 'seo',      label: 'SEO',            icon: Globe },
      { key: 'tracking', label: 'Tracking',       icon: BarChart2 },
      { key: 'blocks',   label: 'Content Blocks', icon: ListChecks },
    ] as const;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedPage(null)} className="p-1.5 rounded-lg border text-neutral-500 hover:bg-neutral-100">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h2 className="font-serif-brand font-bold text-xl text-[#2F5233]">{freshPage.title}</h2>
              <span className="text-xs font-mono text-neutral-400">/landing/{freshPage.slug}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePreview(freshPage.slug)} className="px-3 py-2 border border-[#2F5233]/20 rounded-xl text-xs font-bold text-[#2F5233] hover:bg-[#FAF7F2] flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              onClick={() => togglePublishLandingPage(freshPage.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${freshPage.isPublished ? 'bg-[#2F5233]/10 text-[#2F5233]' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
            >
              {freshPage.isPublished ? <><Eye className="w-3.5 h-3.5" /> Published</> : <><EyeOff className="w-3.5 h-3.5" /> Draft</>}
            </button>
          </div>
        </div>

        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${activeSection === s.key ? 'bg-white shadow-xs text-[#2F5233]' : 'text-neutral-500 hover:text-neutral-700'}`}>
                <Icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        {activeSection === 'meta' && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-[#2F5233] border-b pb-2">Page Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Campaign Title</label>
                <input className={inputCls} value={selectedPage.title} onChange={e => setSelectedPage({ ...selectedPage, title: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>URL Slug</label>
                <input className={inputCls + " font-mono"} value={selectedPage.slug} onChange={e => setSelectedPage({ ...selectedPage, slug: e.target.value })} />
                <p className="text-neutral-400 mt-1">URL: /landing/{selectedPage.slug}</p>
              </div>
              <div>
                <label className={labelCls}>Page Countdown End (optional)</label>
                <input type="datetime-local" className={inputCls + " font-mono"}
                  value={selectedPage.countdownEndsAt ? selectedPage.countdownEndsAt.slice(0, 16) : ''}
                  onChange={e => setSelectedPage({ ...selectedPage, countdownEndsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                <p className="text-neutral-400 mt-1">Used by Countdown Timer blocks on this page</p>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" id="noindex-toggle" checked={selectedPage.isNoIndex} onChange={e => setSelectedPage({ ...selectedPage, isNoIndex: e.target.checked })} className="rounded" />
                <label htmlFor="noindex-toggle" className="font-bold text-neutral-700">Noindex (hide from search engines)</label>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t">
              <button onClick={handleSavePageMeta} className="px-5 py-2.5 bg-[#2F5233] text-white rounded-xl font-bold text-xs flex items-center gap-2">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>
        )}

        {activeSection === 'seo' && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-[#2F5233] border-b pb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> SEO & Social Sharing</h3>
            <div>
              <label className={labelCls}>SEO Page Title</label>
              <input className={inputCls} value={selectedPage.seoTitle || ''} onChange={e => setSelectedPage({ ...selectedPage, seoTitle: e.target.value })} placeholder="Buy Raw Honey | GoodZeed" />
              <p className="text-neutral-400 mt-1">{(selectedPage.seoTitle || '').length}/60 chars recommended</p>
            </div>
            <div>
              <label className={labelCls}>Meta Description</label>
              <textarea className={inputCls} rows={3} value={selectedPage.seoDescription || ''} onChange={e => setSelectedPage({ ...selectedPage, seoDescription: e.target.value })} placeholder="Short description for Google search results..." />
              <p className="text-neutral-400 mt-1">{(selectedPage.seoDescription || '').length}/160 chars recommended</p>
            </div>
            <MediaUploadInput label="Social Share Image (OG Image — 1200×630px recommended)" value={selectedPage.socialShareImage || ''} onChange={url => setSelectedPage({ ...selectedPage, socialShareImage: url })} />
            {selectedPage.socialShareImage && <img src={selectedPage.socialShareImage} alt="OG Preview" className="h-24 rounded-xl border object-cover" />}
            <div className="flex justify-end pt-2 border-t">
              <button onClick={handleSavePageMeta} className="px-5 py-2.5 bg-[#2F5233] text-white rounded-xl font-bold text-xs flex items-center gap-2">
                <Save className="w-3.5 h-3.5" /> Save SEO
              </button>
            </div>
          </div>
        )}

        {activeSection === 'tracking' && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-[#2F5233] border-b pb-2 flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Analytics & Tracking</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800 flex gap-2 text-[11px]">
              <BarChart2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Tracking codes are injected on this landing page only and removed when visitors navigate away.
            </div>
            <div>
              <label className={labelCls + " flex items-center gap-1.5"}><Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook Pixel ID</label>
              <input className={inputCls + " font-mono"} value={selectedPage.facebookPixelId || ''} onChange={e => setSelectedPage({ ...selectedPage, facebookPixelId: e.target.value })} placeholder="e.g. 1234567890123456" />
              <p className="text-neutral-400 mt-1">Pixel ID only — do not paste the full script</p>
            </div>
            <div>
              <label className={labelCls + " flex items-center gap-1.5"}><BarChart2 className="w-3.5 h-3.5 text-orange-500" /> Google Analytics / GTM ID</label>
              <input className={inputCls + " font-mono"} value={selectedPage.googleAnalyticsId || ''} onChange={e => setSelectedPage({ ...selectedPage, googleAnalyticsId: e.target.value })} placeholder="e.g. G-XXXXXXXXXX or GTM-XXXXXXX" />
              <p className="text-neutral-400 mt-1">GA4 Measurement ID or GTM Container ID</p>
            </div>
            <div className="flex justify-end pt-2 border-t">
              <button onClick={handleSavePageMeta} className="px-5 py-2.5 bg-[#2F5233] text-white rounded-xl font-bold text-xs flex items-center gap-2">
                <Save className="w-3.5 h-3.5" /> Save Tracking
              </button>
            </div>
          </div>
        )}

        {activeSection === 'blocks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#2A2A28]">{freshPage.blocks.length} Content Block{freshPage.blocks.length !== 1 ? 's' : ''}</h3>
              <button onClick={() => setAddingBlockType('HERO')} className="px-3.5 py-2 bg-[#2F5233] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#3D6B45]">
                <Plus className="w-3.5 h-3.5" /> Add Block
              </button>
            </div>

            {addingBlockType !== null && (
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 space-y-4">
                <h4 className="font-bold text-sm">Choose Block Type</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BLOCK_TYPE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button key={opt.type} onClick={() => setAddingBlockType(opt.type)}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${addingBlockType === opt.type ? 'border-[#2F5233] bg-[#2F5233]/5 ring-1 ring-[#2F5233]' : 'border-neutral-200 hover:border-[#2F5233]/40'}`}>
                        <Icon className="w-4 h-4 mb-1.5 text-[#2F5233]" />
                        <div className="font-bold">{opt.label}</div>
                        <div className="text-neutral-400 text-[10px] mt-0.5 line-clamp-2">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button onClick={() => setAddingBlockType(null)} className="px-4 py-2 text-neutral-500 font-bold text-xs">Cancel</button>
                  <button onClick={handleAddBlock} className="px-5 py-2 bg-[#2F5233] text-white rounded-xl font-bold text-xs flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add {BLOCK_TYPE_OPTIONS.find(o => o.type === addingBlockType)?.label}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {freshPage.blocks.sort((a, b) => a.sortOrder - b.sortOrder).map((block, idx) => {
                const meta = BLOCK_TYPE_OPTIONS.find(o => o.type === block.blockType);
                const Icon = meta?.icon || Layout;
                return (
                  <div key={block.id} className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#FAF7F2] text-[#2F5233] font-bold text-xs flex items-center justify-center border font-mono">{idx + 1}</span>
                        <Icon className="w-4 h-4 text-[#2F5233]" />
                        <div>
                          <div className="font-bold text-sm">{meta?.label || block.blockType}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{block.blockType}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditingBlock(editingBlock?.id === block.id ? null : block)} className="p-1.5 rounded-lg border text-neutral-600 hover:bg-[#FAF7F2]" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (window.confirm('Delete this block?')) deleteLandingPageBlock(freshPage.id, block.id); }} className="p-1.5 rounded-lg border text-neutral-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {editingBlock?.id === block.id && (
                      <div className="border-t p-4 bg-[#FAF7F2] space-y-4">
                        <BlockEditor block={editingBlock} onChange={setEditingBlock} products={productOptions} />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingBlock(null)} className="px-4 py-2 text-neutral-500 font-bold text-xs">Cancel</button>
                          <button onClick={handleSaveBlock} className="px-5 py-2 bg-[#2F5233] text-white rounded-xl font-bold text-xs flex items-center gap-1.5">
                            <Save className="w-3.5 h-3.5" /> Save Block
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {freshPage.blocks.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl text-neutral-400 text-sm">
                  No blocks yet. Click "Add Block" to build your page.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">Create high-converting campaign pages with flexible content blocks, SEO control, and conversion tracking.</p>
        <button onClick={handleCreateNew} className="px-4 py-2 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0">
          <Plus className="w-3.5 h-3.5" /> New Campaign
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {landingPages.map(page => (
          <div key={page.id} className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#2F5233]/30 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">/landing/{page.slug}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${page.isPublished ? 'bg-[#2F5233]/10 text-[#2F5233]' : 'bg-neutral-100 text-neutral-500'}`}>
                  {page.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <h3 className="font-serif-brand font-bold text-base text-[#2A2A28]">{page.title}</h3>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{page.seoDescription}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span className="flex items-center gap-1"><Layout className="w-3 h-3" /> {page.blocks.length} blocks</span>
                {page.facebookPixelId && <span className="flex items-center gap-1 text-blue-600"><Facebook className="w-3 h-3" /> Pixel</span>}
                {page.googleAnalyticsId && <span className="flex items-center gap-1 text-orange-500"><BarChart2 className="w-3 h-3" /> GA</span>}
                {page.countdownEndsAt && <span className="flex items-center gap-1 text-red-500"><Clock className="w-3 h-3" /> Timer</span>}
              </div>
            </div>
            <div className="pt-3 border-t flex items-center justify-between">
              <button onClick={() => handlePreview(page.slug)} className="text-xs font-bold text-[#2F5233] hover:underline flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </button>
              <div className="flex items-center gap-1.5">
                <button onClick={() => togglePublishLandingPage(page.id)} className="p-1.5 rounded-lg border hover:bg-[#FAF7F2] text-neutral-600" title={page.isPublished ? 'Unpublish' : 'Publish'}>
                  {page.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setSelectedPage(page)} className="p-1.5 rounded-lg border hover:bg-[#FAF7F2] text-neutral-600" title="Edit Campaign">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { if (window.confirm('Delete "' + page.title + '"?')) deleteLandingPage(page.id); }} className="p-1.5 rounded-lg border hover:bg-red-50 text-neutral-400 hover:text-red-600" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {landingPages.length === 0 && (
          <div className="md:col-span-2 text-center py-16 border-2 border-dashed border-neutral-200 rounded-2xl text-neutral-400 text-sm">
            No campaign pages yet. Click "New Campaign" to create your first one.
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Export ────────────────────────────────────────────────────────────
export const AdminSalesMarketing: React.FC<AdminSalesMarketingProps> = ({ defaultTab = 'hero' }) => {
  const [tab, setTab] = useState<'hero' | 'campaigns'>(defaultTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">Sales & Marketing</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">Manage hero banners, campaign landing pages, SEO, and conversion tracking.</p>
        </div>
      </div>

      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {([
          { key: 'hero',      label: 'Hero Banner CMS', icon: ImageIcon },
          { key: 'campaigns', label: 'Campaign Pages',   icon: Megaphone },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} id={'sales-tab-' + t.key} onClick={() => setTab(t.key)}
              className={'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ' + (tab === t.key ? 'bg-white shadow-xs text-[#2F5233]' : 'text-neutral-500 hover:text-neutral-700')}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {tab === 'hero' && <HeroBannerTab />}
      {tab === 'campaigns' && <CampaignPagesTab />}
    </div>
  );
};
