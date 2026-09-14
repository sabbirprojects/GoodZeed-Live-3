import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Link } from 'lucide-react';
import { uploadMedia, MediaFolder } from '../../services/storageService';

interface MediaUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  folder?: MediaFolder;
}

/**
 * Dual-mode image input: paste a URL OR upload a local file directly to Supabase Storage.
 */
export const MediaUploadInput: React.FC<MediaUploadInputProps> = ({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Paste image URL or upload a file...',
  className = '',
  folder = 'general'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, WebP, GIF, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    // Direct upload to Supabase Storage
    try {
      const res = await uploadMedia(file, (folder as MediaFolder) || 'general');
      if (res.success && res.url) {
        onChange(res.url);
        setIsUploading(false);
        e.target.value = '';
        return;
      }
      throw new Error(res.error || 'Supabase Storage upload failed');
    } catch (err: any) {
      console.error('Upload failed', err);
      setUploadError(err?.message || 'Failed to upload image. Please try again.');
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setUploadError(null);
  };

  const isDataUrl = value.startsWith('data:');
  const hasValue = !!value;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block font-bold text-xs text-[#2A2A28]">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Image Preview */}
      {hasValue && (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 group">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {isDataUrl && (
            <div className="absolute top-1.5 left-1.5 bg-[#2F5233] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Uploaded
            </div>
          )}
        </div>
      )}

      {/* URL Input + Upload Button Row */}
      <div className="flex items-center gap-2">
        {/* URL Text Input */}
        <div className="relative flex-1">
          <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={isDataUrl ? '(Uploaded image — base64)' : value}
            readOnly={isDataUrl}
            onChange={e => !isDataUrl && onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full pl-8 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5233] transition ${
              isDataUrl ? 'bg-[#FAF7F2] text-neutral-500 cursor-default' : 'bg-white'
            }`}
          />
        </div>

        {/* Upload File Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#2F5233] hover:bg-[#3D6B45] disabled:bg-neutral-300 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
          title="Upload image from your device"
        >
          {isUploading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{isUploading ? 'Reading…' : 'Upload'}</span>
        </button>

        {/* Clear button when URL is set */}
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Clear image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Error Message */}
      {uploadError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <X className="w-3 h-3" /> {uploadError}
        </p>
      )}

      {/* Helper text */}
      {!hasValue && (
        <p className="text-[10px] text-neutral-400">
          <ImageIcon className="w-3 h-3 inline mr-0.5" />
          Paste an image URL above, or click Upload to save directly to public/uploads/ (max 5MB)
        </p>
      )}
    </div>
  );
};
