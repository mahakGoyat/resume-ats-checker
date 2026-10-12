import { useState } from 'react';
import { FileImage } from 'lucide-react';

type CoverImageProps = {
  src: string;
  alt: string;
  className?: string;
  imgProps?: Record<string, unknown>;
};

/**
 * Cover image that falls back to the alt text when the image cannot be loaded,
 * so readers (and search engines) always see something descriptive instead of a
 * blank box.
 */
export function CoverImage({ src, alt, className, imgProps }: CoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`${className ?? ''} grid place-items-center overflow-hidden border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] px-4 text-center`}>
        <div className="py-4">
          <FileImage className="mx-auto size-5 text-[hsl(var(--muted-foreground)/.7)]" />
          <p className="mt-2 text-xs font-bold leading-5 text-[hsl(var(--foreground))]">{alt}</p>
          <p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">This image could not be loaded.</p>
        </div>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} {...imgProps} />;
}