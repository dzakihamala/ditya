"use client";

import { useState, useEffect, useCallback } from "react";

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
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
