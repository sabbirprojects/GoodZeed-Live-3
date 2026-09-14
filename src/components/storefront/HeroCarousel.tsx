'use client';

import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import { Button } from '@/components/ui/button';
import { useBilingual } from '@/hooks/useBilingual';
import { cn } from '@/lib/utils';

interface SlideItem {
  id: string;
  bannerId: number;
  titleEn: string;
  titleBn: string;
  subtitleEn: string | null;
  subtitleBn: string | null;
  ctaTextEn: string | null;
  ctaTextBn: string | null;
  ctaUrl: string | null;
  mediaUrl: string;
  alt: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (!match) return null;
  const id = match[1];
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&controls=0&rel=0&showinfo=0&modestbranding=1`;
}

function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (!match) return null;
  return `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&loop=1&autopause=0&background=1`;
}

function VideoSlide({ mediaUrl }: { mediaUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const youtubeUrl = getYouTubeEmbedUrl(mediaUrl);
  const vimeoUrl = !youtubeUrl ? getVimeoEmbedUrl(mediaUrl) : null;

  if (youtubeUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <iframe
          src={youtubeUrl}
          title={'Hero Video'}
          allow="autoplay; encrypted-media; picture-in-picture"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2 object-cover opacity-70"
        />
      </div>
    );
  }

  if (vimeoUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <iframe
          src={vimeoUrl}
          title={'Hero Video'}
          allow="autoplay; fullscreen"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2 object-cover opacity-70"
        />
      </div>
    );
  }

  // Direct MP4 / WebM video file
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        void videoRef.current.pause();
        setIsPlaying(false);
      } else {
        void videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted={isMuted}
        loop
        playsInline
        className="h-full w-full object-cover opacity-75 transition-opacity duration-500"
      />
      {/* Video playback & audio controls */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/80 transition"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/80 transition"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function HeroCarousel({ banners }: { banners: any[] }) {
  const { t, localize } = useBilingual();

  // If no banners configured, show brand fallback
  if (!banners || !banners.length) {
    return (
      <section className="bg-gradient-to-br from-brand-800 to-brand-950 text-white">
        <div className="container-x py-16 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">🌿 GoodZeed</h1>
          <p className="mt-3 text-brand-100">{t('footer.tagline')}</p>
          <Button asChild className="mt-6 bg-white text-brand-800 hover:bg-brand-50">
            <a href="/products">{t('home.heroCta')}</a>
          </Button>
        </div>
      </section>
    );
  }

  // Flatten banners and their media items into a cohesive list of slides
  const slides: SlideItem[] = [];
  banners.forEach((b) => {
    if (b.media && b.media.length > 0) {
      b.media.forEach((item, idx) => {
        slides.push({
          id: `${b.id}-media-${idx}-${item.url}`,
          bannerId: b.id,
          titleEn: b.titleEn,
          titleBn: b.titleBn,
          subtitleEn: b.subtitleEn,
          subtitleBn: b.subtitleBn,
          ctaTextEn: b.ctaTextEn,
          ctaTextBn: b.ctaTextBn,
          ctaUrl: b.ctaUrl,
          mediaUrl: item.url,
          alt: item.alt || b.titleEn,
        });
      });
    } else if (b.imageUrl) {
      // Backwards compatibility with single image banners
      slides.push({
        id: `${b.id}-legacy-${b.imageUrl}`,
        bannerId: b.id,
        titleEn: b.titleEn,
        titleBn: b.titleBn,
        subtitleEn: b.subtitleEn,
        subtitleBn: b.subtitleBn,
        ctaTextEn: b.ctaTextEn,
        ctaTextBn: b.ctaTextBn,
        ctaUrl: b.ctaUrl,
        mediaUrl: b.imageUrl,
        alt: b.titleEn,
      });
    }
  });

  if (!slides.length) {
    return null;
  }

  return (
    <section className="relative h-[380px] sm:h-[460px] md:h-[520px] lg:h-[580px] w-full overflow-hidden bg-brand-950">
      <Swiper
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={750}
        loop={slides.length > 1}
        autoplay={{
          delay: 5500,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: slides.length > 5,
        }}
        navigation={slides.length > 1}
        className="hero-swiper h-full w-full"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={slide.id} className="relative h-full w-full overflow-hidden">
            {/* Background Media: Image */}
            <div className="relative h-full w-full">
              <img
                src={slide.mediaUrl}
                alt={slide.alt || localize(slide, 'title')}
                className="h-full w-full object-cover opacity-65 transition-transform duration-1000 ease-out hover:scale-105"
              />
            </div>

            {/* Dark gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent pointer-events-none z-10" />

            {/* Slide Content Overlay */}
            <div className="container-x absolute inset-0 z-20 flex flex-col justify-center text-white pointer-events-none">
              <div className="pointer-events-auto max-w-xl">
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl drop-shadow-sm">
                  {localize(slide, 'title')}
                </h1>
                {(slide.subtitleEn || slide.subtitleBn) && (
                  <p className="mt-3 max-w-lg text-sm sm:text-base md:text-lg text-white/90 drop-shadow">
                    {localize(slide, 'subtitle')}
                  </p>
                )}
                <Button
                  asChild
                  size="lg"
                  className="mt-6 w-fit bg-brand-600 font-medium text-white shadow-lg hover:bg-brand-500 hover:shadow-brand-900/30 transition-all"
                >
                  <a href={slide.ctaUrl ?? '/products'}>
                    {localize(slide, 'ctaText') || t('home.heroCta')}
                  </a>
                </Button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}