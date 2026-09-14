import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Upload,
  X,
  GripVertical,
  Play,
  Image as ImageIcon,
  Link,
  Info,
  Plus,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { ProductMediaItem } from '../../types';
import { detectProductMediaType, parseVideoUrl, syncLegacyImages } from '../../utils/mediaUtils';

interface ProductMediaManagerProps {
  media: ProductMediaItem[];
  onMediaChange: (media: ProductMediaItem[], legacyImages: string[]) => void;
}

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm';
const MAX_IMAGE_SIZE_MB = 2;
const MAX_VIDEO_SIZE_MB = 15;

function generateId() {
  return `pm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const ProductMediaManager: React.FC<ProductMediaManagerProps> = ({
  media,
  onMediaChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRef = useRef(media);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  const notifyChange = useCallback(
    (updated: ProductMediaItem[]) => {
      onMediaChange(updated, syncLegacyImages(updated));
    },
    [onMediaChange]
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const addedItems: ProductMediaItem[] = [];
    let failedCount = 0;

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const maxMB = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
      if (file.size > maxMB * 1024 * 1024) {
        alert(`"${file.name}" exceeds the ${maxMB}MB limit. Please compress and re-upload.`);
        continue;
      }

      // Upload to /api/upload so files land in public/uploads/ and survive restarts.
      // No base64/blob fallback: data URLs exceed localStorage quota and bloat
      // store.json, silently breaking settings/homepage persistence.
      let finalUrl = '';
      try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch('/api/upload', { method: 'POST', body: formData });
        if (resp.ok) {
          const json = await resp.json();
          if (json && json.url) {
            finalUrl = json.url;
          } else {
            failedCount += 1;
          }
        } else {
          failedCount += 1;
        }
      } catch (err) {
        console.warn('[ProductMediaManager] Upload to /api/upload failed:', err);
        failedCount += 1;
      }

      if (!finalUrl) {
        continue;
      }

      addedItems.push({
        id: generateId(),
        type: isVideo ? 'video' : 'image',
        url: finalUrl,
        altText: file.name.replace(/\.[^/.]+$/, ''),
        videoSource: isVideo ? 'direct' : undefined
      });
    }

    setIsUploading(false);
    if (failedCount > 0) {
      alert(
        `${failedCount} file(s) could not be uploaded. Make sure the backend is running (npm run dev / node server.js) and try a smaller file, or add media via URL instead.`
      );
    }
    if (addedItems.length > 0) {
      notifyChange([...mediaRef.current, ...addedItems]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDropzoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropzoneActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) { setUrlError('Please enter a URL.'); return; }
    try { new URL(trimmed); } catch { setUrlError('Invalid URL. Please enter a complete URL starting with https://'); return; }
    if (media.some(m => m.url === trimmed)) { setUrlError('This URL is already in the media list.'); return; }
    const type = detectProductMediaType(trimmed);
    const videoInfo = type === 'video' ? parseVideoUrl(trimmed) : null;
    const newItem: ProductMediaItem = {
      id: generateId(), type, url: trimmed,
      videoSource: videoInfo ? videoInfo.type : undefined,
      thumbnailUrl: videoInfo?.thumbnailUrl
    };
    notifyChange([...media, newItem]);
    setUrlInput(''); setUrlError(''); setAddingUrl(false);
  };

  const handleRemove = (id: string) => notifyChange(media.filter(m => m.id !== id));

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragSourceIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragSourceIndex === null || dragSourceIndex === dropIndex) {
      setDragSourceIndex(null); setDragOverIndex(null); return;
    }
    const updated = [...media];
    const [moved] = updated.splice(dragSourceIndex, 1);
    updated.splice(dropIndex, 0, moved);
    setDragSourceIndex(null); setDragOverIndex(null);
    notifyChange(updated);
  };

  const handleDragEnd = () => { setDragSourceIndex(null); setDragOverIndex(null); };

  const handleAltChange = (id: string, value: string) =>
    notifyChange(media.map(m => (m.id === id ? { ...m, altText: value } : m)));

  const getYtThumb = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
  };

  const renderThumb = (item: ProductMediaItem) => {
    if (item.type === 'image') {
      return (
        <img src={item.url} alt={item.altText || 'product image'}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=200&q=60'; }} />
      );
    }
    const thumbSrc = item.thumbnailUrl || (item.videoSource === 'youtube' ? getYtThumb(item.url) : null);
    return (
      <div className="w-full h-full bg-neutral-900 flex items-center justify-center relative">
        {thumbSrc && <img src={thumbSrc} alt="video thumbnail" className="w-full h-full object-cover opacity-70" />}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shadow">
            <Play className="w-4 h-4 text-neutral-900 ml-0.5" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Size hints */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
        <div className="flex items-center gap-1.5 font-bold mb-1">
          <Info className="w-3.5 h-3.5" /> Media Guidelines
        </div>
        <ul className="space-y-0.5 list-disc list-inside text-blue-700 leading-relaxed">
          <li><strong>Image Aspect Ratio:</strong> 1:1 Square (e.g. 1000×1000px) or 4:5 vertical (e.g. 800×1000px)</li>
          <li><strong>Image Size:</strong> Max 2MB per image (PNG, JPG, WebP)</li>
          <li><strong>Video:</strong> MP4 / WebM — max 15MB, or paste a YouTube / Vimeo URL</li>
          <li>Any resolution is accepted; images scale automatically with object-fit.</li>
        </ul>
      </div>

      {/* Dropzone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dropzoneActive ? 'border-[#2F5233] bg-[#2F5233]/5' : 'border-neutral-300 hover:border-[#2F5233] hover:bg-neutral-50'} ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDropzoneActive(true); }}
        onDragLeave={() => setDropzoneActive(false)}
        onDrop={handleDropzoneDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-2">
            <span className="w-8 h-8 border-3 border-[#2F5233]/30 border-t-[#2F5233] rounded-full animate-spin mb-2" />
            <p className="text-sm font-bold text-[#2F5233]">Uploading and saving to public/uploads/...</p>
          </div>
        ) : (
          <>
            <Upload className="w-7 h-7 mx-auto text-neutral-400 mb-2" />
            <p className="text-sm font-semibold text-neutral-700">Drop images or video here, or <span className="text-[#2F5233] underline">browse</span></p>
            <p className="text-xs text-neutral-400 mt-1">PNG, JPG, WebP (max 2MB) · MP4, WebM (max 15MB) · Saved locally to public/uploads/</p>
          </>
        )}
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileInputChange} />
      </div>

      {/* URL input */}
      <div>
        {!addingUrl ? (
          <button type="button" onClick={() => setAddingUrl(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#2F5233] hover:underline">
            <Link className="w-3.5 h-3.5" /> Add Media via URL (image, YouTube, Vimeo, or MP4 link)
          </button>
        ) : (
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <input type="url" placeholder="https://..." value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                className={`w-full text-sm px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2F5233] ${urlError ? 'border-red-400' : 'border-neutral-300'}`} />
              {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
            </div>
            <button type="button" onClick={handleAddUrl}
              className="px-3 py-2 bg-[#2F5233] hover:bg-[#1e3b22] text-white text-xs font-bold rounded-xl">
              <Plus className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => { setAddingUrl(false); setUrlInput(''); setUrlError(''); }}
              className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-600 text-xs font-bold rounded-xl">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Media grid */}
      {media.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
              {media.length} item{media.length !== 1 ? 's' : ''} — drag to reorder
            </p>
            {media.length > 1 && (
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <GripVertical className="w-3 h-3" /> First item = primary media
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {media.map((item, index) => (
              <div key={item.id} draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group rounded-xl border-2 overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                  dragOverIndex === index ? 'border-[#2F5233] scale-105 shadow-lg'
                  : dragSourceIndex === index ? 'opacity-40 border-dashed border-neutral-400'
                  : 'border-transparent hover:border-[#2F5233]/30'
                }`}
              >
                <div className="aspect-square bg-neutral-100">{renderThumb(item)}</div>
                {/* Badges */}
                <div className="absolute top-1.5 left-1.5 flex gap-1">
                  {index === 0 && (
                    <span className="flex items-center gap-0.5 bg-[#2F5233] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Primary
                    </span>
                  )}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.type === 'video' ? 'bg-purple-600 text-white' : 'bg-neutral-900/60 text-white'}`}>
                    {item.type === 'video'
                      ? <span className="flex items-center gap-0.5"><Play className="w-2.5 h-2.5" /> Video</span>
                      : <span className="flex items-center gap-0.5"><ImageIcon className="w-2.5 h-2.5" /> Image</span>}
                  </span>
                </div>
                {/* Drag handle */}
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/80 rounded p-0.5"><GripVertical className="w-3.5 h-3.5 text-neutral-500" /></div>
                </div>
                {/* Remove */}
                <button type="button" onClick={() => handleRemove(item.id)}
                  className="absolute bottom-8 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow">
                  <Trash2 className="w-3 h-3" />
                </button>
                {/* Alt text */}
                <input type="text" placeholder="Alt text / caption" value={item.altText || ''}
                  onChange={e => handleAltChange(item.id, e.target.value)}
                  className="w-full text-[10px] px-2 py-1 bg-white border-t border-neutral-200 focus:outline-none focus:bg-[#FAF7F2] truncate" />
              </div>
            ))}
          </div>
        </div>
      )}
      {media.length === 0 && (
        <p className="text-xs text-neutral-400 text-center py-2">No media added yet. Upload images/video or paste a URL above.</p>
      )}
    </div>
  );
};
