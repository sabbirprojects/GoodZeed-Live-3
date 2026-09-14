import React, { useState, useRef, useCallback } from 'react';
import { HeroMediaItem, HeroMediaType, HeroCtaLinkType } from '../../types';
import { detectMediaType, parseVideoUrl, validateCtaUrl } from '../../utils/mediaUtils';
import {
  Upload,
  Link,
  Plus,
  Trash2,
  Video,
  Image as ImageIcon,
  Sparkles,
  Info,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Code2,
  GripVertical,
  Sun,
  Moon,
  Contrast,
  ExternalLink
} from 'lucide-react';

export interface HeroMediaManagerProduct {
  id: string;
  name: string;
  slug: string;
}
export interface HeroMediaManagerCategory {
  id: string;
  name: string;
  slug: string;
}
export interface HeroMediaManagerLandingPage {
  id: string;
  title: string;
  slug: string;
}

interface HeroMediaManagerProps {
  mediaList: HeroMediaItem[];
  onChange: (updatedList: HeroMediaItem[]) => void;
  className?: string;
  products?: HeroMediaManagerProduct[];
  categories?: HeroMediaManagerCategory[];
  landingPages?: HeroMediaManagerLandingPage[];
}

const CTA_LINK_TYPE_OPTIONS: { value: HeroCtaLinkType | 'track-order'; label: string }[] = [
  { value: 'shop',        label: 'All Products (Shop)' },
  { value: 'category',    label: 'Category Page' },
  { value: 'product',     label: 'Product Page' },
  { value: 'cms',         label: 'CMS / Landing Page' },
  { value: 'custom',      label: 'Custom URL' },
  { value: 'track-order', label: 'Track Order Page' },
];

const OVERLAY_OPTIONS: { value: HeroMediaItem['overlay']; label: string; icon: React.ElementType }[] = [
  { value: 'light',  label: 'Light',  icon: Sun },
  { value: 'medium', label: 'Medium', icon: Contrast },
  { value: 'dark',   label: 'Dark',   icon: Moon },
];

// Slide Content Editor
interface SlideEditorProps {
  item: HeroMediaItem;
  onUpdate: (patch: Partial<HeroMediaItem>) => void;
  products: HeroMediaManagerProduct[];
  categories: HeroMediaManagerCategory[];
  landingPages: HeroMediaManagerLandingPage[];
}

const SlideEditor: React.FC<SlideEditorProps> = ({ item, onUpdate, products, categories, landingPages }) => {
  const inputCls = 'w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5233] bg-white';
  const labelCls = 'block text-[10px] font-bold text-neutral-500 mb-0.5';
  const [ctaUrlError, setCtaUrlError] = useState<string | null>(null);
  const [secUrlError, setSecUrlError] = useState<string | null>(null);
  const isAdvanced = !!item.advancedHtml;

  return (
    <div className="space-y-4 p-3 bg-[#FAF7F2]/70 rounded-xl border border-[#2F5233]/10">
      {/* Advanced HTML toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">Slide Content</span>
        <button
          type="button"
          onClick={() => onUpdate({ advancedHtml: isAdvanced ? undefined : '<!-- Enter custom HTML for this slide -->' })}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${isAdvanced ? 'bg-neutral-900 text-green-400 border-neutral-700' : 'bg-white text-neutral-500 border-neutral-200 hover:border-[#2F5233]'}`}
        >
          <Code2 className="w-3 h-3" /> {isAdvanced ? 'HTML Mode ON' : 'Advanced HTML'}
        </button>
      </div>

      {isAdvanced ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800 text-[10px]">
            <Code2 className="w-3 h-3 shrink-0 mt-0.5" />
            <span>HTML replaces the text content area only. The media background and overlay gradient are still applied.</span>
          </div>
          <label className={labelCls}>Raw HTML Content</label>
          <textarea
            className="w-full px-2.5 py-2 border rounded-lg text-[11px] font-mono bg-neutral-950 text-green-400 focus:outline-none focus:ring-2 focus:ring-[#2F5233]"
            rows={8}
            value={item.advancedHtml || ''}
            onChange={e => onUpdate({ advancedHtml: e.target.value })}
            spellCheck={false}
            placeholder="<h2>Custom HTML</h2><p>Your slide content...</p>"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Badge <span className="text-neutral-400 font-normal">(overrides global default)</span></label>
            <input className={inputCls} value={item.badge || ''} onChange={e => onUpdate({ badge: e.target.value })} placeholder="e.g. 100% Raw • Direct Harvest" />
          </div>
          <div>
            <label className={labelCls}>Title / Headline <span className="text-neutral-400 font-normal">(overrides global)</span></label>
            <input className={inputCls} value={item.title || ''} onChange={e => onUpdate({ title: e.target.value })} placeholder="Main slide headline..." />
          </div>
          <div>
            <label className={labelCls}>Subtitle <span className="text-neutral-400 font-normal">(Bengali or supporting text)</span></label>
            <input className={inputCls} value={item.subtitle || ''} onChange={e => onUpdate({ subtitle: e.target.value })} placeholder="সুন্দরবনের খাঁটি বুনো মধু..." />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} rows={2} value={item.description || ''} onChange={e => onUpdate({ description: e.target.value })} placeholder="Short description shown under the headline..." />
          </div>
        </div>
      )}

      {/* Primary CTA */}
      <div className="border-t pt-3 space-y-2">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">Primary CTA</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Button Text</label>
            <input className={inputCls} value={item.ctaText || ''} onChange={e => onUpdate({ ctaText: e.target.value })} placeholder="e.g. Shop Now" />
          </div>
          <div>
            <label className={labelCls}>Link Type</label>
            <select className={inputCls} value={item.ctaLinkType || 'shop'} onChange={e => onUpdate({ ctaLinkType: e.target.value as HeroCtaLinkType })}>
              {CTA_LINK_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {item.ctaLinkType === 'category' && (
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={item.ctaCategorySlug || ''} onChange={e => onUpdate({ ctaCategorySlug: e.target.value })}>
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            {item.ctaCategorySlug && <p className="text-[10px] text-neutral-400 mt-0.5">→ /category/{item.ctaCategorySlug}</p>}
          </div>
        )}
        {item.ctaLinkType === 'product' && (
          <div>
            <label className={labelCls}>Product</label>
            <select className={inputCls} value={item.ctaProductSlug || ''} onChange={e => onUpdate({ ctaProductSlug: e.target.value })}>
              <option value="">— Select product —</option>
              {products.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
            </select>
            {item.ctaProductSlug && <p className="text-[10px] text-neutral-400 mt-0.5">→ /product/{item.ctaProductSlug}</p>}
          </div>
        )}
        {item.ctaLinkType === 'cms' && (
          <div>
            <label className={labelCls}>CMS / Landing Page</label>
            <select className={inputCls} value={item.ctaLandingSlug || ''} onChange={e => onUpdate({ ctaLandingSlug: e.target.value })}>
              <option value="">— Select page —</option>
              {landingPages.map(p => <option key={p.id} value={p.slug}>{p.title}</option>)}
            </select>
            {item.ctaLandingSlug && <p className="text-[10px] text-neutral-400 mt-0.5">→ /landing/{item.ctaLandingSlug}</p>}
          </div>
        )}
        {item.ctaLinkType === 'custom' && (
          <div>
            <label className={labelCls}>Custom URL</label>
            <div className="relative">
              <ExternalLink className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
              <input
                className={`${inputCls} pl-7 ${ctaUrlError ? 'border-red-400' : ''}`}
                value={item.ctaCustomUrl || ''}
                onChange={e => { onUpdate({ ctaCustomUrl: e.target.value }); setCtaUrlError(null); }}
                onBlur={() => item.ctaLinkType === 'custom' && setCtaUrlError(validateCtaUrl(item.ctaCustomUrl || ''))}
                placeholder="https://example.com/page"
              />
            </div>
            {ctaUrlError && <p className="text-[10px] text-red-600 mt-0.5">{ctaUrlError}</p>}
          </div>
        )}
      </div>

      {/* Secondary CTA */}
      <div className="border-t pt-3 space-y-2">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">Secondary CTA <span className="font-normal normal-case">(optional)</span></span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Button Text</label>
            <input className={inputCls} value={item.secondaryCtaText || ''} onChange={e => onUpdate({ secondaryCtaText: e.target.value || undefined })} placeholder="e.g. Learn More" />
          </div>
          <div>
            <label className={labelCls}>Link Type</label>
            <select className={inputCls} value={item.secondaryCtaLinkType || ''} onChange={e => onUpdate({ secondaryCtaLinkType: (e.target.value as any) || undefined })}>
              <option value="">— Same as Primary —</option>
              {CTA_LINK_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {item.secondaryCtaLinkType === 'category' && (
          <select className={inputCls} value={item.secondaryCtaCategorySlug || ''} onChange={e => onUpdate({ secondaryCtaCategorySlug: e.target.value })}>
            <option value="">— Select category —</option>
            {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        )}
        {item.secondaryCtaLinkType === 'product' && (
          <select className={inputCls} value={item.secondaryCtaProductSlug || ''} onChange={e => onUpdate({ secondaryCtaProductSlug: e.target.value })}>
            <option value="">— Select product —</option>
            {products.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
          </select>
        )}
        {item.secondaryCtaLinkType === 'cms' && (
          <select className={inputCls} value={item.secondaryCtaLandingSlug || ''} onChange={e => onUpdate({ secondaryCtaLandingSlug: e.target.value })}>
            <option value="">— Select page —</option>
            {landingPages.map(p => <option key={p.id} value={p.slug}>{p.title}</option>)}
          </select>
        )}
        {item.secondaryCtaLinkType === 'custom' && (
          <div>
            <div className="relative">
              <ExternalLink className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
              <input
                className={`${inputCls} pl-7 ${secUrlError ? 'border-red-400' : ''}`}
                value={item.secondaryCtaCustomUrl || ''}
                onChange={e => { onUpdate({ secondaryCtaCustomUrl: e.target.value }); setSecUrlError(null); }}
                onBlur={() => item.secondaryCtaLinkType === 'custom' && setSecUrlError(validateCtaUrl(item.secondaryCtaCustomUrl || ''))}
                placeholder="https://example.com/page"
              />
            </div>
            {secUrlError && <p className="text-[10px] text-red-600 mt-0.5">{secUrlError}</p>}
          </div>
        )}
      </div>

      {/* Overlay & Status */}
      <div className="border-t pt-3 grid grid-cols-2 gap-3">
        <div>
          <span className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Overlay Intensity</span>
          <div className="flex gap-1">
            {OVERLAY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = (item.overlay || 'medium') === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdate({ overlay: opt.value })}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] font-bold transition-colors ${active ? 'bg-[#2F5233] text-white border-[#2F5233]' : 'bg-white text-neutral-500 border-neutral-200 hover:border-[#2F5233]/40'}`}
                  title={opt.label}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Slide Status</span>
          <div className="flex gap-1">
            {(['published', 'draft'] as const).map(s => {
              const active = (item.status || 'published') === s;
              const Icon = s === 'published' ? Eye : EyeOff;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onUpdate({ status: s })}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] font-bold transition-colors capitalize ${active ? (s === 'published' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-neutral-500 text-white border-neutral-500') : 'bg-white text-neutral-500 border-neutral-200 hover:border-[#2F5233]/40'}`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{s === 'published' ? 'Live' : 'Draft'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main HeroMediaManager
export const HeroMediaManager: React.FC<HeroMediaManagerProps> = ({
  mediaList,
  onChange,
  className = '',
  products = [],
  categories = [],
  landingPages = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [altTextInput, setAltTextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dragIndexRef = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const notifySuccess = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);
    const newItems: HeroMediaItem[] = [];
    const errors: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      if (!isImg && !isVid) { errors.push(`"${file.name}" is not a recognized image or video format.`); continue; }
      const maxSize = isVid ? 35 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) { errors.push(`"${file.name}" exceeds the ${isVid ? '35MB' : '10MB'} limit.`); continue; }
      let url: string | null = null;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch('/api/upload', { method: 'POST', body: formData });
        if (resp.ok) {
          const json = await resp.json();
          if (json && json.url) url = json.url;
          else errors.push(`"${file.name}": upload rejected by server.`);
        } else {
          errors.push(`"${file.name}": upload failed (server ${resp.status}).`);
        }
      } catch {
        errors.push(`"${file.name}": could not reach upload server.`);
      }
      if (!url) continue;
      newItems.push({
        id: `media-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        type: (isVid ? 'video' : 'image') as HeroMediaType,
        url,
        title: file.name.replace(/\.[^/.]+$/, ''),
        altText: file.name.replace(/\.[^/.]+$/, ''),
        videoSource: isVid ? 'direct' : undefined,
        status: 'published',
        overlay: 'medium',
      });
    }
    if (errors.length > 0) setErrorMessage(errors.join(' '));
    if (newItems.length > 0) {
      onChange([...mediaList, ...newItems]);
      notifySuccess(`Added ${newItems.length} media item(s) to the hero carousel.`);
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;
    const detectedType = detectMediaType(cleanUrl);
    const videoDetails = detectedType === 'video' ? parseVideoUrl(cleanUrl) : null;
    onChange([...mediaList, {
      id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: detectedType,
      url: cleanUrl,
      title: altTextInput.trim() || (detectedType === 'video' ? 'Hero Video' : 'Hero Image'),
      altText: altTextInput.trim() || 'Hero Banner Media',
      thumbnailUrl: videoDetails?.thumbnailUrl,
      videoSource: videoDetails?.type,
      status: 'published',
      overlay: 'medium',
    }]);
    setUrlInput('');
    setAltTextInput('');
    setErrorMessage(null);
    notifySuccess(`Added ${detectedType.toUpperCase()} item to hero banner.`);
  };

  const handleUpdateItem = (id: string, patch: Partial<HeroMediaItem>) => {
    onChange(mediaList.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const handleRemove = (id: string) => {
    onChange(mediaList.filter(item => item.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const handleDuplicate = (id: string, idx: number) => {
    const original = mediaList.find(item => item.id === id);
    if (!original) return;
    const clone: HeroMediaItem = {
      ...original,
      id: `media-${Date.now()}-clone-${Math.random().toString(36).substr(2, 5)}`,
      status: 'draft',
      title: `${original.title || 'Slide'} (Copy)`,
    };
    const updated = [...mediaList];
    updated.splice(idx + 1, 0, clone);
    onChange(updated);
    notifySuccess('Slide duplicated as Draft.');
  };

  const handleDragStart = useCallback((idx: number) => {
    dragIndexRef.current = idx;
    setDraggingIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const dragIdx = dragIndexRef.current;
    if (dragIdx === null || dragIdx === dropIdx) {
      setDraggingIdx(null);
      setDragOverIdx(null);
      return;
    }
    const updated = [...mediaList];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(dropIdx, 0, moved);
    onChange(updated);
    setDraggingIdx(null);
    setDragOverIdx(null);
    dragIndexRef.current = null;
  }, [mediaList, onChange]);

  const handleDragEnd = useCallback(() => {
    setDraggingIdx(null);
    setDragOverIdx(null);
    dragIndexRef.current = null;
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Guidelines */}
      <div className="bg-[#FAF7F2] border border-[#2F5233]/20 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-[#2F5233]">
          <Info className="w-4 h-4 text-[#D9A441] shrink-0" />
          <span>Hero Banner Media Guidelines & Dynamic Scaling</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-neutral-600">
          <div className="bg-white/80 p-2.5 rounded-xl border border-neutral-200/80">
            <span className="font-bold text-[#2A2A28] block mb-0.5 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5 text-[#2F5233]" /> Image Guidelines</span>
            <span><strong>Recommended:</strong> 1920×1080px (16:9). Max 10MB. JPG, PNG, WebP, GIF.</span>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-neutral-200/80">
            <span className="font-bold text-[#2A2A28] block mb-0.5 flex items-center gap-1"><Video className="w-3.5 h-3.5 text-blue-600" /> Video Guidelines</span>
            <span><strong>Formats:</strong> MP4, WebM, YouTube, Vimeo. Max 35MB for direct uploads.</span>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-neutral-200/80">
            <span className="font-bold text-[#2A2A28] block mb-0.5 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-[#D9A441]" /> Dynamic Auto-Fit</span>
            <span>Accepts <strong>ANY</strong> aspect ratio. Storefront fills via <code className="text-[10px] bg-neutral-100 px-1 rounded">object-fit: cover</code>.</span>
          </div>
        </div>
      </div>

      {/* Add Media */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b pb-2.5">
          <span className="font-bold text-xs text-[#2A2A28]">Add Media to Carousel</span>
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-xs">
            <button type="button" onClick={() => setActiveTab('upload')} className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${activeTab === 'upload' ? 'bg-white text-[#2F5233] shadow-xs' : 'text-neutral-500 hover:text-neutral-700'}`}>
              <Upload className="w-3 h-3" /> Upload Files
            </button>
            <button type="button" onClick={() => setActiveTab('url')} className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${activeTab === 'url' ? 'bg-white text-[#2F5233] shadow-xs' : 'text-neutral-500 hover:text-neutral-700'}`}>
              <Link className="w-3 h-3" /> Paste URL
            </button>
          </div>
        </div>

        {activeTab === 'upload' && (
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-neutral-300 hover:border-[#2F5233] rounded-xl p-5 text-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-[#FAF7F2]/60 group">
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime" className="hidden" onChange={handleFilesSelected} />
            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-neutral-200 flex items-center justify-center text-[#2F5233] group-hover:scale-110 transition-transform">
                {isUploading ? <span className="w-4 h-4 border-2 border-[#2F5233] border-t-transparent rounded-full animate-spin" /> : <Upload className="w-5 h-5" />}
              </div>
              <span className="text-xs font-bold text-[#2A2A28]">{isUploading ? 'Uploading…' : 'Click to Browse or Upload Multiple Images & Videos'}</span>
              <span className="text-[10px] text-neutral-400">JPG, PNG, WebP, GIF, MP4, WebM • Any resolution supported</span>
            </div>
          </div>
        )}

        {activeTab === 'url' && (
          <form onSubmit={handleAddUrl} className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">Media URL (Image, MP4/WebM, YouTube, or Vimeo)</label>
                <div className="relative">
                  <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input type="url" required value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://images.unsplash.com/... or https://youtube.com/watch?v=..." className="w-full pl-8 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5233]" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">Title / Caption (Optional)</label>
                <input type="text" value={altTextInput} onChange={e => setAltTextInput(e.target.value)} placeholder="e.g. Sundarban Harvest Reel" className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5233]" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs">
                <Plus className="w-3.5 h-3.5" /> Add to Carousel
              </button>
            </div>
          </form>
        )}

        {errorMessage && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMessage}</span>
          </div>
        )}
        {successNotice && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{successNotice}</span>
          </div>
        )}
      </div>

      {/* Slides List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-[#2A2A28]">
            Carousel Slides & Media Order ({mediaList.length} {mediaList.length === 1 ? 'slide' : 'slides'})
          </span>
          {mediaList.length > 0 && (
            <span className="text-[10px] text-neutral-400 flex items-center gap-1">
              <GripVertical className="w-3 h-3" /> Drag to reorder
            </span>
          )}
        </div>

        {mediaList.length === 0 ? (
          <div className="p-6 border border-dashed border-neutral-300 rounded-2xl text-center text-neutral-400 text-xs bg-white">
            No media items yet. Default storefront slides will display until you add items above.
          </div>
        ) : (
          <div className="space-y-2">
            {mediaList.map((item, idx) => {
              const isVideo = item.type === 'video';
              const parsedVideo = isVideo ? parseVideoUrl(item.url) : null;
              const displayThumb = item.thumbnailUrl || parsedVideo?.thumbnailUrl || (!isVideo ? item.url : undefined);
              const isExpanded = expandedId === item.id;
              const isDraft = item.status === 'draft';
              const isDragging = draggingIdx === idx;
              const isDragTarget = dragOverIdx === idx && draggingIdx !== idx;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={e => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white rounded-2xl border shadow-xs transition-all ${isDragging ? 'opacity-40 scale-[0.98] border-dashed border-[#2F5233]' : isDragTarget ? 'border-[#D9A441] ring-2 ring-[#D9A441]/40 scale-[1.01]' : 'border-neutral-200 hover:border-[#2F5233]/30'}`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-neutral-100">
                      {displayThumb ? (
                        <img src={displayThumb} alt={item.title || 'Slide'} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-500">
                          {isVideo ? <Play className="w-4 h-4 fill-current" /> : <ImageIcon className="w-4 h-4" />}
                        </div>
                      )}
                      {isVideo && displayThumb && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Play className="w-3 h-3 text-white fill-current ml-0.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="w-5 h-5 rounded-md bg-neutral-100 text-neutral-600 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${isVideo ? 'bg-blue-100 text-blue-700' : 'bg-[#2F5233]/10 text-[#2F5233]'}`}>
                          {isVideo ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                          {isVideo ? (parsedVideo?.type === 'youtube' ? 'YouTube' : parsedVideo?.type === 'vimeo' ? 'Vimeo' : 'Video') : 'Image'}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${isDraft ? 'bg-neutral-100 text-neutral-500' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isDraft ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                          {isDraft ? 'Draft' : 'Live'}
                        </span>
                        {item.overlay && item.overlay !== 'medium' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-neutral-100 text-neutral-600">
                            {item.overlay === 'light' ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                            {item.overlay}
                          </span>
                        )}
                        {idx === 0 && <span className="px-1.5 py-0.5 rounded-md bg-[#D9A441] text-[#2A2A28] text-[9px] font-extrabold uppercase">Primary</span>}
                      </div>
                      <p className="text-[11px] font-semibold text-neutral-700 truncate mt-0.5">
                        {item.title || item.badge || <span className="text-neutral-400 italic">Untitled slide</span>}
                      </p>
                      <p className="text-[10px] font-mono text-neutral-400 truncate">
                        {item.url.startsWith('/uploads') ? item.url : item.url.length > 50 ? item.url.slice(0, 50) + '…' : item.url}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => handleDuplicate(item.id, idx)} className="p-1.5 rounded-lg border text-neutral-400 hover:text-[#2F5233] hover:bg-[#FAF7F2] hover:border-[#2F5233]/30 transition-colors" title="Duplicate slide">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setExpandedId(isExpanded ? null : item.id)} className={`p-1.5 rounded-lg border transition-colors ${isExpanded ? 'bg-[#2F5233] text-white border-[#2F5233]' : 'text-neutral-500 hover:bg-neutral-100'}`} title={isExpanded ? 'Collapse editor' : 'Edit slide content'}>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button type="button" onClick={() => handleRemove(item.id)} className="p-1.5 rounded-lg border text-neutral-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors" title="Remove this slide">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-neutral-100 p-3">
                      <SlideEditor
                        item={item}
                        onUpdate={patch => handleUpdateItem(item.id, patch)}
                        products={products}
                        categories={categories}
                        landingPages={landingPages}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
