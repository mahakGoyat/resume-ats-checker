import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

export const GA_MEASUREMENT_ID = 'G-Q9FENSLBWG';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackPageView(path: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('config', GA_MEASUREMENT_ID, { page_path: path });
}

export function usePageViewTracking() {
  const [location] = useLocation();
  const firstMount = useRef(true);

  useEffect(() => {
    const path = location === '' ? '/' : location;
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    trackPageView(path);
  }, [location]);
}