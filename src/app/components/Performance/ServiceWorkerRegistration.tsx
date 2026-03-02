/**
 * Legacy service worker cleanup component.
 * The service worker is intentionally disabled because cached app-shell/API
 * responses are unsafe for this auth-heavy app and have caused reload issues
 * on iPhone Safari.
 */

"use client";

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister()))
      )
      .then(() => {
        if (!('caches' in window)) return;
        return caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith('klio-'))
              .map((key) => caches.delete(key))
          )
        );
      })
      .catch(() => {});
  }, []);

  return null;
}

