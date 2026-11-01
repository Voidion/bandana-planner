import { useEffect, useState } from 'react';

/** Re-renders every `ms` while `on` (for running timers). */
export function useNow(on: boolean, ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => set(n => n + 1), ms);
    return () => clearInterval(id);
  }, [on, ms]);
  return Date.now();
}
