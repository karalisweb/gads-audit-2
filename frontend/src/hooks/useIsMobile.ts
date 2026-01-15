import { useState, useEffect } from 'react';

/**
 * Hook per rilevare se il dispositivo è mobile (breakpoint md = 768px)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

/**
 * Hook per ottenere il view mode di default basato sulla viewport
 */
export function useDefaultViewMode(): 'cards' | 'table' {
  const isMobile = useIsMobile();
  return isMobile ? 'cards' : 'table';
}
