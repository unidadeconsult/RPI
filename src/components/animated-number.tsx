"use client";

import { useEffect, useRef, useState } from "react";

/** Conta de 0 até o valor final ao montar -- efeito sutil, respeita prefers-reduced-motion. */
export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = prefersReducedMotion || value === 0 ? 0 : 650;
    const start = performance.now();

    function tick(now: number) {
      const progress = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    }

    const handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [value]);

  return <>{display.toLocaleString("pt-BR")}</>;
}
