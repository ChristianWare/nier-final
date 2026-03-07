"use client";

import { useEffect } from "react";

export default function ClearHash() {
  useEffect(() => {
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return null;
}
