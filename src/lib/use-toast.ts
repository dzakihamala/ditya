"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<ReactNode | null>(null);

  const showToast = useCallback((message: ReactNode) => {
    setToast(message);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hideToast, duration);
    return () => clearTimeout(timer);
  }, [toast, hideToast, duration]);

  return { toast, showToast, hideToast };
}
