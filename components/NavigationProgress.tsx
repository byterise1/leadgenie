'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Clear any existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Start progress
    setProgress(15);
    setVisible(true);

    // Fast crawl to 85%
    let p = 15;
    intervalRef.current = setInterval(() => {
      p = p + (85 - p) * 0.18;
      setProgress(p);
    }, 80);

    // Complete after short delay
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(100);
      setTimeout(() => setVisible(false), 200);
    }, 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none">
      <div
        className="h-full bg-blue-500 transition-all duration-100 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1, transition: progress >= 100 ? 'opacity 0.2s, width 0.1s' : 'width 0.1s' }}
      />
    </div>
  );
}
