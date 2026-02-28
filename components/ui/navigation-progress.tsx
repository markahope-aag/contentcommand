"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const startProgress = useCallback(() => {
    setVisible(true);
    setProgress(0);

    // Animate to 80% quickly, then slow down
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15;
      if (current >= 80) {
        current = 80 + Math.random() * 5;
        clearInterval(interval);
      }
      setProgress(Math.min(current, 90));
    }, 100);

    return interval;
  }, []);

  const completeProgress = useCallback(() => {
    setProgress(100);
    const timeout = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
    return timeout;
  }, []);

  useEffect(() => {
    // Complete progress when route changes
    const timeout = completeProgress();
    return () => clearTimeout(timeout);
  }, [pathname, searchParams, completeProgress]);

  // Listen for navigation starts via link clicks
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      // Only show for internal navigation that would cause a route change
      if (href !== pathname) {
        interval = startProgress();
      }
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (interval) clearInterval(interval);
    };
  }, [pathname, startProgress]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-0.5">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
