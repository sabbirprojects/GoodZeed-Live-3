import React, { useState } from 'react';
import logoImg from '../../assets/logo.png';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'badge';
  theme?: 'dark-bg' | 'light-bg' | 'auto';
  showSubtitle?: boolean;
  className?: string;
  imgClassName?: string;
}

const sizeMap = {
  sm: {
    img: 'w-7 h-7 sm:w-8 sm:h-8',
    text: 'text-lg sm:text-xl',
    sub: 'text-[9px]',
    badge: 'text-[8px] px-1 py-0.2'
  },
  md: {
    img: 'w-9 h-9 sm:w-10 sm:h-10',
    text: 'text-xl sm:text-2xl',
    sub: 'text-[10px]',
    badge: 'text-[9px] px-1.5 py-0.5'
  },
  lg: {
    img: 'w-11 h-11 sm:w-12 sm:h-12',
    text: 'text-2xl sm:text-3xl',
    sub: 'text-xs',
    badge: 'text-[10px] px-2 py-0.5'
  },
  xl: {
    img: 'w-14 h-14 sm:w-16 sm:h-16',
    text: 'text-3xl sm:text-4xl',
    sub: 'text-xs sm:text-sm',
    badge: 'text-xs px-2.5 py-1'
  }
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light-bg',
  showSubtitle = true,
  className = '',
  imgClassName = ''
}) => {
  const [imgError, setImgError] = useState(false);
  const currentSize = sizeMap[size];

  const isDarkBg = theme === 'dark-bg';

  const titleColor = isDarkBg ? 'text-white' : 'text-[#2F5233]';
  const subColor = isDarkBg ? 'text-white/70' : 'text-[#2A2A28]/70';
  const badgeStyle = isDarkBg
    ? 'bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/30'
    : 'bg-[#3D6B45]/15 text-[#2F5233]';

  const logoImage = (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden transition-transform ${currentSize.img} ${imgClassName}`}
    >
      {!imgError ? (
        <img
          src={logoImg}
          alt="GoodZeed Logo"
          className="w-full h-full object-contain filter drop-shadow-xs"
          onError={() => setImgError(true)}
          loading="eager"
        />
      ) : (
        <div className="w-full h-full rounded-xl bg-[#2F5233] flex items-center justify-center text-[#D9A441] font-serif-brand font-bold text-lg shadow-xs">
          GZ
        </div>
      )}
    </div>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{logoImage}</div>;
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 text-left ${className}`}>
      {logoImage}

      <div className="min-w-0">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-serif-brand font-extrabold tracking-tight ${currentSize.text} ${titleColor}`}
          >
            GoodZeed
          </span>
          <span
            className={`uppercase font-bold tracking-wider rounded font-sans ${currentSize.badge} ${badgeStyle}`}
          >
            BD
          </span>
        </div>
        {showSubtitle && (
          <p className={`${currentSize.sub} ${subColor} mt-0.5 truncate hidden sm:block`}>
            Pure, Natural Everyday Food
          </p>
        )}
      </div>
    </div>
  );
};
