import Image from "next/image";

type OptimizedImageProps = {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Оптимизированный компонент изображения для Next.js
 * - Автоматическая оптимизация и сжатие
 * - Lazy loading по умолчанию
 * - Поддержка современных форматов (WebP, AVIF)
 * - Предотвращение layout shift
 */
export function OptimizedImage({
  src,
  alt,
  title,
  width = 100,
  height = 100,
  className = "",
  priority = false,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      title={title}
      width={width}
      height={height}
      className={className}
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      quality={priority ? 85 : 75}
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
