'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type TouchEvent } from 'react';

const AUTO_PLAY_DELAY = 4000;
const AUTO_PLAY_RESUME_DELAY = 3000;
const SWIPE_THRESHOLD = 50;

const SLIDES = [
  {
    image: '/images/carousel/slide1.png',
    alt: 'Соревнование по лыжам',
    title: 'Лыжи',
  },
  {
    image: '/images/carousel/slide2.png',
    alt: 'Шахматный турнир',
    title: 'Шахматы',
  },
  {
    image: '/images/carousel/slide3.png',
    alt: 'Онлайн-соревнование',
    title: 'Онлайн-соревнование',
  },
  {
    image: '/images/carousel/slide4.png',
    alt: 'Соревнование по сборке ПК',
    title: 'Сборка ПК',
  },
  {
    image: '/images/carousel/slide5.png',
    alt: 'Соревнование по количеству съеденной еды',
    title: 'Съеденная еда',
  },
];

export function CarouselSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoPlayResume = () => {
    setIsAutoPlayPaused(true);

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = setTimeout(() => {
      setIsAutoPlayPaused(false);
      resumeTimeoutRef.current = null;
    }, AUTO_PLAY_RESUME_DELAY);
  };

  const goToSlide = (index: number, isManual = false) => {
    if (isManual) {
      scheduleAutoPlayResume();
    }

    setCurrentSlide(index);
  };

  const goToPrevious = (isManual = false) => {
    if (isManual) {
      scheduleAutoPlayResume();
    }

    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const goToNext = (isManual = false) => {
    if (isManual) {
      scheduleAutoPlayResume();
    }

    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  useEffect(() => {
    if (isAutoPlayPaused) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_PLAY_DELAY);

    return () => clearInterval(timer);
  }, [isAutoPlayPaused]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touchX = event.touches[0]?.clientX;

    if (typeof touchX !== 'number') {
      return;
    }

    touchStartXRef.current = touchX;
    touchCurrentXRef.current = touchX;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const touchX = event.touches[0]?.clientX;

    if (typeof touchX !== 'number') {
      return;
    }

    touchCurrentXRef.current = touchX;
  };

  const handleTouchEnd = () => {
    const touchStartX = touchStartXRef.current;
    const touchCurrentX = touchCurrentXRef.current;

    touchStartXRef.current = null;
    touchCurrentXRef.current = null;

    if (touchStartX === null || touchCurrentX === null) {
      return;
    }

    const deltaX = touchCurrentX - touchStartX;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      return;
    }

    if (deltaX > 0) {
      goToPrevious(true);
      return;
    }

    goToNext(true);
  };

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-3xl bg-gray-200 shadow-2xl touch-pan-y"
      role="region"
      aria-label="Галерея соревнований"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {SLIDES.map((slide, index) => (
        <div
          key={slide.image}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
          role="group"
          aria-label={slide.title}
          aria-hidden={index !== currentSlide}
        >
          <Image
            src={slide.image}
            alt={slide.alt}
            title={slide.title}
            fill
            priority={index === 0}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="absolute inset-0 object-cover object-center"
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>
      ))}

      <button
        onClick={() => goToPrevious(true)}
        className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all hover:bg-white"
        aria-label="Предыдущий слайд"
        title="Предыдущий слайд"
      >
        <svg className="h-6 w-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={() => goToNext(true)}
        className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all hover:bg-white"
        aria-label="Следующий слайд"
        title="Следующий слайд"
      >
        <svg className="h-6 w-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3" role="tablist" aria-label="Навигация по слайдам">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.image}
            onClick={() => goToSlide(index, true)}
            className={`rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'h-3 w-8 bg-[#7D39EB]'
                : 'h-3 w-3 bg-gray-400 hover:bg-gray-600'
            }`}
            role="tab"
            aria-label={`Слайд ${index + 1}: ${slide.title}`}
            aria-selected={index === currentSlide}
            title={slide.title}
          />
        ))}
      </div>
    </div>
  );
}
